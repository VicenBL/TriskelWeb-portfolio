import { createPublicKey, verify } from "node:crypto";
import {
	assertNonEmptyToken,
	AuthTokenVerificationError,
	type AuthTokenVerifier,
	type VerifiedAuthToken,
} from "./auth-tokens";

const FIREBASE_CERTIFICATES_URL =
	"https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
const MAX_FIREBASE_SUB_LENGTH = 128;

type JwtHeader = Readonly<{
	alg?: unknown;
	kid?: unknown;
}>;

type FirebaseIdTokenPayload = Readonly<{
	aud?: unknown;
	exp?: unknown;
	iat?: unknown;
	iss?: unknown;
	sub?: unknown;
	email?: unknown;
	email_verified?: unknown;
}>;

type CertificateCache = Readonly<{
	certificates: ReadonlyMap<string, string>;
	expiresAt: number;
}>;

export type FirebaseAuthConfig = Readonly<{
	projectId?: string;
	certificatesUrl?: string;
	now?: () => Date;
	fetcher?: typeof fetch;
}>;

export class FirebaseAuthConfigurationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "FirebaseAuthConfigurationError";
	}
}

export function createFirebaseTokenVerifier(
	config: FirebaseAuthConfig,
): AuthTokenVerifier {
	return new FirebaseTokenVerifier(config);
}

class FirebaseTokenVerifier implements AuthTokenVerifier {
	private certificateCache: CertificateCache | undefined;
	private readonly projectId: string;
	private readonly certificatesUrl: string;
	private readonly now: () => Date;
	private readonly fetcher: typeof fetch;

	constructor(config: FirebaseAuthConfig) {
		this.projectId = normalizeProjectId(config.projectId);
		this.certificatesUrl = config.certificatesUrl ?? FIREBASE_CERTIFICATES_URL;
		this.now = config.now ?? (() => new Date());
		this.fetcher = config.fetcher ?? fetch;
	}

	async verifyIdToken(idToken: string): Promise<VerifiedAuthToken> {
		const token = assertNonEmptyToken(idToken, "idToken");
		const { header, payload, signingInput, signature } = parseJwt(token);

		if (header.alg !== "RS256" || typeof header.kid !== "string") {
			throw new AuthTokenVerificationError();
		}

		const certificate = await this.getCertificate(header.kid);

		if (!verifySignature(signingInput, signature, certificate)) {
			throw new AuthTokenVerificationError();
		}

		return this.verifyPayload(payload);
	}

	private verifyPayload(payload: FirebaseIdTokenPayload): VerifiedAuthToken {
		const uid = assertString(payload.sub, "sub");
		const issuedAt = assertUnixSeconds(payload.iat, "iat");
		const expiresAt = assertUnixSeconds(payload.exp, "exp");
		const nowSeconds = Math.floor(this.now().getTime() / 1000);

		if (uid.length === 0 || uid.length > MAX_FIREBASE_SUB_LENGTH) {
			throw new AuthTokenVerificationError();
		}

		if (payload.aud !== this.projectId) {
			throw new AuthTokenVerificationError();
		}

		if (payload.iss !== `https://securetoken.google.com/${this.projectId}`) {
			throw new AuthTokenVerificationError();
		}

		if (expiresAt <= nowSeconds || issuedAt > nowSeconds) {
			throw new AuthTokenVerificationError();
		}

		return {
			provider: "firebase",
			uid,
			email: typeof payload.email === "string" ? payload.email : undefined,
			emailVerified: payload.email_verified === true,
			issuedAt: new Date(issuedAt * 1000),
			expiresAt: new Date(expiresAt * 1000),
		};
	}

	private async getCertificate(kid: string): Promise<string> {
		const nowMs = this.now().getTime();

		if (this.certificateCache && this.certificateCache.expiresAt > nowMs) {
			const cached = this.certificateCache.certificates.get(kid);
			if (cached) {
				return cached;
			}
		}

		const response = await this.fetcher(this.certificatesUrl);

		if (!response.ok) {
			throw new AuthTokenVerificationError();
		}

		const certificates = parseCertificateResponse(await response.json());
		this.certificateCache = {
			certificates,
			expiresAt: nowMs + getMaxAgeMs(response.headers.get("cache-control")),
		};
		const certificate = certificates.get(kid);

		if (!certificate) {
			throw new AuthTokenVerificationError();
		}

		return certificate;
	}
}

function parseJwt(token: string): Readonly<{
	header: JwtHeader;
	payload: FirebaseIdTokenPayload;
	signingInput: string;
	signature: Buffer;
}> {
	const [encodedHeader, encodedPayload, encodedSignature, extra] =
		token.split(".");

	if (
		!encodedHeader ||
		!encodedPayload ||
		!encodedSignature ||
		extra !== undefined
	) {
		throw new AuthTokenVerificationError();
	}

	return {
		header: parseJsonSegment<JwtHeader>(encodedHeader),
		payload: parseJsonSegment<FirebaseIdTokenPayload>(encodedPayload),
		signingInput: `${encodedHeader}.${encodedPayload}`,
		signature: Buffer.from(encodedSignature, "base64url"),
	};
}

function parseJsonSegment<T>(segment: string): T {
	try {
		return JSON.parse(Buffer.from(segment, "base64url").toString("utf8")) as T;
	} catch {
		throw new AuthTokenVerificationError();
	}
}

function verifySignature(
	signingInput: string,
	signature: Buffer,
	certificate: string,
): boolean {
	try {
		return verify(
			"RSA-SHA256",
			Buffer.from(signingInput),
			createPublicKey(certificate),
			signature,
		);
	} catch {
		throw new AuthTokenVerificationError();
	}
}

function parseCertificateResponse(value: unknown): ReadonlyMap<string, string> {
	if (!isRecord(value)) {
		throw new AuthTokenVerificationError();
	}

	const certificates = new Map<string, string>();

	for (const [kid, certificate] of Object.entries(value)) {
		if (typeof certificate === "string") {
			certificates.set(kid, certificate);
		}
	}

	return certificates;
}

function getMaxAgeMs(cacheControl: string | null): number {
	const maxAge = cacheControl
		?.split(",")
		.map((part) => part.trim())
		.find((part) => part.startsWith("max-age="))
		?.slice("max-age=".length);
	const seconds = maxAge ? Number.parseInt(maxAge, 10) : 3600;

	return Number.isSafeInteger(seconds) && seconds > 0
		? seconds * 1000
		: 3600000;
}

function assertString(value: unknown, fieldName: string): string {
	if (typeof value !== "string") {
		throw new AuthTokenVerificationError(`${fieldName} must be a string`);
	}

	return value;
}

function assertUnixSeconds(value: unknown, fieldName: string): number {
	if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
		throw new AuthTokenVerificationError(
			`${fieldName} must be a unix timestamp`,
		);
	}

	return value;
}

function normalizeProjectId(projectId: string | undefined): string {
	const normalized = projectId?.trim();

	if (!normalized) {
		throw new FirebaseAuthConfigurationError("FIREBASE_PROJECT_ID is required");
	}

	return normalized;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
