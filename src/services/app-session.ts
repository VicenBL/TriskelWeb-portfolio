import { createHmac, timingSafeEqual } from "node:crypto";

export const APP_SESSION_COOKIE_NAME = "triskelweb_session";
export const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

const SESSION_VERSION = 1;
const SIGNATURE_ALGORITHM = "sha256";

export type AppSessionClaims = Readonly<{
	version: typeof SESSION_VERSION;
	accountId: string;
	customerId: string;
	isAdmin: boolean;
	emailVerified: boolean;
	role?: string;
	issuedAt: number;
	expiresAt: number;
}>;

export type CreateAppSessionInput = Readonly<{
	accountId: string;
	customerId: string;
	isAdmin: boolean;
	emailVerified: boolean;
	role?: string;
}>;

export type AppSessionCookieOptions = Readonly<{
	name?: string;
	maxAgeSeconds?: number;
	secure?: boolean;
}>;

export interface AppSessionCodec {
	sign(claims: AppSessionClaims): string;
	verify(token: string): AppSessionClaims;
}

export type ReadAppSessionCookieOptions = Readonly<{
	name?: string;
}>;

export class AppSessionError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "AppSessionError";
	}
}

export class AppSessionConfigurationError extends AppSessionError {
	constructor(message: string) {
		super(message);
		this.name = "AppSessionConfigurationError";
	}
}

export class InvalidAppSessionError extends AppSessionError {
	constructor(message = "Invalid app session") {
		super(message);
		this.name = "InvalidAppSessionError";
	}
}

export function createAppSessionClaims(
	input: CreateAppSessionInput,
	options: Readonly<{
		now?: Date;
		ttlSeconds?: number;
	}> = {},
): AppSessionClaims {
	const now = options.now ?? new Date();
	assertValidDate(now, "now");
	const ttlSeconds = options.ttlSeconds ?? DEFAULT_SESSION_TTL_SECONDS;

	if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0) {
		throw new AppSessionError("ttlSeconds must be a positive integer");
	}

	const issuedAt = Math.floor(now.getTime() / 1000);

	return {
		version: SESSION_VERSION,
		accountId: normalizeNonEmpty(input.accountId, "accountId"),
		customerId: normalizeNonEmpty(input.customerId, "customerId"),
		isAdmin: input.isAdmin,
		emailVerified: input.emailVerified,
		role: normalizeOptional(input.role),
		issuedAt,
		expiresAt: issuedAt + ttlSeconds,
	};
}

export function createHmacAppSessionCodec(
	options: Readonly<{
		secret: string;
		now?: () => Date;
	}>,
): AppSessionCodec {
	const secret = normalizeSecret(options.secret);
	const now = options.now ?? (() => new Date());

	return {
		sign(claims: AppSessionClaims): string {
			const payload = encodeBase64Url(
				JSON.stringify(assertValidClaims(claims)),
			);
			const signature = signPayload(payload, secret);
			return `${payload}.${signature}`;
		},
		verify(token: string): AppSessionClaims {
			const [payload, signature, extra] = token.split(".");

			if (!payload || !signature || extra !== undefined) {
				throw new InvalidAppSessionError();
			}

			assertSignature(payload, signature, secret);
			const claims = parseClaims(payload);
			const currentTime = now();
			assertValidDate(currentTime, "now");

			if (claims.expiresAt <= Math.floor(currentTime.getTime() / 1000)) {
				throw new InvalidAppSessionError("App session has expired");
			}

			return claims;
		},
	};
}

export function buildSessionCookieHeader(
	token: string,
	options: AppSessionCookieOptions = {},
): string {
	const maxAgeSeconds = options.maxAgeSeconds ?? DEFAULT_SESSION_TTL_SECONDS;
	const parts = [
		`${options.name ?? APP_SESSION_COOKIE_NAME}=${token}`,
		"Path=/",
		"HttpOnly",
		"SameSite=Lax",
		`Max-Age=${maxAgeSeconds}`,
	];

	if (options.secure) {
		parts.push("Secure");
	}

	return parts.join("; ");
}

export function buildClearSessionCookieHeader(
	options: AppSessionCookieOptions = {},
): string {
	const parts = [
		`${options.name ?? APP_SESSION_COOKIE_NAME}=`,
		"Path=/",
		"HttpOnly",
		"SameSite=Lax",
		"Max-Age=0",
	];

	if (options.secure) {
		parts.push("Secure");
	}

	return parts.join("; ");
}

export function readAppSessionCookieToken(
	cookieHeader: string | null,
	options: ReadAppSessionCookieOptions = {},
): string | null {
	if (!cookieHeader) {
		return null;
	}

	const cookieName = options.name ?? APP_SESSION_COOKIE_NAME;

	for (const cookiePart of cookieHeader.split(";")) {
		const trimmedCookie = cookiePart.trim();
		const separatorIndex = trimmedCookie.indexOf("=");

		if (separatorIndex === -1) {
			continue;
		}

		const name = trimmedCookie.slice(0, separatorIndex).trim();

		if (name === cookieName) {
			return trimmedCookie.slice(separatorIndex + 1).trim();
		}
	}

	return null;
}

export function verifyAppSessionCookieToken(
	token: string,
	codec: AppSessionCodec,
): AppSessionClaims | null {
	const normalizedToken = token.trim();

	if (normalizedToken.length === 0) {
		return null;
	}

	try {
		return codec.verify(normalizedToken);
	} catch (error) {
		if (error instanceof InvalidAppSessionError) {
			return null;
		}

		throw error;
	}
}

function signPayload(payload: string, secret: string): string {
	return createHmac(SIGNATURE_ALGORITHM, secret)
		.update(payload)
		.digest("base64url");
}

function assertSignature(
	payload: string,
	signature: string,
	secret: string,
): void {
	const expected = signPayload(payload, secret);
	const expectedBuffer = Buffer.from(expected, "base64url");
	const actualBuffer = Buffer.from(signature, "base64url");

	if (
		expectedBuffer.length !== actualBuffer.length ||
		!timingSafeEqual(expectedBuffer, actualBuffer)
	) {
		throw new InvalidAppSessionError();
	}
}

function parseClaims(payload: string): AppSessionClaims {
	try {
		const decoded = JSON.parse(
			Buffer.from(payload, "base64url").toString("utf8"),
		);
		return assertValidClaims(decoded);
	} catch (error) {
		if (error instanceof AppSessionError) {
			throw error;
		}

		throw new InvalidAppSessionError();
	}
}

function assertValidClaims(value: unknown): AppSessionClaims {
	if (!isRecord(value)) {
		throw new InvalidAppSessionError();
	}

	if (value.version !== SESSION_VERSION) {
		throw new InvalidAppSessionError();
	}

	if (typeof value.isAdmin !== "boolean") {
		throw new InvalidAppSessionError();
	}

	if (typeof value.emailVerified !== "boolean") {
		throw new InvalidAppSessionError();
	}

	const issuedAt = assertUnixTimestamp(value.issuedAt, "issuedAt");
	const expiresAt = assertUnixTimestamp(value.expiresAt, "expiresAt");

	if (expiresAt <= issuedAt) {
		throw new InvalidAppSessionError();
	}

	return {
		version: SESSION_VERSION,
		accountId: normalizeNonEmpty(value.accountId, "accountId"),
		customerId: normalizeNonEmpty(value.customerId, "customerId"),
		isAdmin: value.isAdmin,
		emailVerified: value.emailVerified,
		role: normalizeOptional(value.role),
		issuedAt,
		expiresAt,
	};
}

function normalizeSecret(secret: string): string {
	const normalized = secret.trim();

	if (Buffer.byteLength(normalized, "utf8") < 32) {
		throw new AppSessionConfigurationError(
			"SESSION_SECRET must be at least 32 bytes",
		);
	}

	return normalized;
}

function normalizeNonEmpty(value: unknown, fieldName: string): string {
	if (typeof value !== "string") {
		throw new InvalidAppSessionError(`${fieldName} must be a string`);
	}

	const normalized = value.trim();

	if (normalized.length === 0) {
		throw new InvalidAppSessionError(`${fieldName} must be non-empty`);
	}

	return normalized;
}

function normalizeOptional(value: unknown): string | undefined {
	if (value === undefined || value === null) {
		return undefined;
	}

	return normalizeNonEmpty(value, "role");
}

function assertUnixTimestamp(value: unknown, fieldName: string): number {
	if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
		throw new InvalidAppSessionError(`${fieldName} must be a unix timestamp`);
	}

	return value;
}

function assertValidDate(value: Date, fieldName: string): void {
	if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
		throw new AppSessionError(`${fieldName} must be a valid date`);
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function encodeBase64Url(value: string): string {
	return Buffer.from(value, "utf8").toString("base64url");
}
