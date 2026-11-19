import { NextResponse } from "next/server";
import { serverEnv } from "../../../../config/env";
import {
	AuthAccountMappingError,
	AuthAccountMappingService,
	AuthAccountNotFoundError,
} from "../../../../services/auth-accounts";
import type { AuthTokenVerifier } from "../../../../services/auth-tokens";
import { AuthTokenVerificationError } from "../../../../services/auth-tokens";
import {
	AppSessionConfigurationError,
	buildClearSessionCookieHeader,
	buildSessionCookieHeader,
	createAppSessionClaims,
	createHmacAppSessionCodec,
	DEFAULT_SESSION_TTL_SECONDS,
	readAppSessionCookieToken,
	type AppSessionClaims,
	type AppSessionCodec,
	verifyAppSessionCookieToken,
} from "../../../../services/app-session";

export type AuthSessionStatusDependencies = Readonly<{
	sessionCodec: AppSessionCodec;
	secureCookies?: boolean;
}>;

export type AuthSessionRouteDependencies = AuthSessionStatusDependencies &
	Readonly<{
		tokenVerifier: AuthTokenVerifier;
		accountMappingService: AuthAccountMappingService;
		now?: () => Date;
		sessionTtlSeconds?: number;
	}>;

type AuthSessionRouteDependencyResolver = () =>
	| AuthSessionRouteDependencies
	| Promise<AuthSessionRouteDependencies>;

type AuthSessionStatusDependencyResolver = () =>
	| AuthSessionStatusDependencies
	| Promise<AuthSessionStatusDependencies>;

export function createAuthSessionRouteHandlers(
	resolveDependencies: AuthSessionRouteDependencyResolver,
	options: Readonly<{
		secureCookies?: boolean;
		resolveStatusDependencies?: AuthSessionStatusDependencyResolver;
	}> = {},
) {
	const resolveStatusDependencies =
		options.resolveStatusDependencies ?? resolveDependencies;

	return {
		async GET(request: Request): Promise<NextResponse> {
			const sessionToken = readAppSessionCookieToken(
				request.headers.get("cookie"),
			);

			if (sessionToken === null) {
				return NextResponse.json({ authenticated: false });
			}

			try {
				const dependencies = await resolveStatusDependencies();
				const claims = verifyAppSessionCookieToken(
					sessionToken,
					dependencies.sessionCodec,
				);

				if (!claims) {
					return createUnauthenticatedSessionResponse({
						clearCookie: true,
						secureCookies: dependencies.secureCookies ?? options.secureCookies,
					});
				}

				return NextResponse.json({
					authenticated: true,
					session: toPublicSession(claims),
				});
			} catch (error) {
				return createAuthSessionErrorResponse(error);
			}
		},

		async POST(request: Request): Promise<NextResponse> {
			try {
				const body = await readSessionRequestBody(request);
				const dependencies = await resolveDependencies();
				const verifiedToken = await dependencies.tokenVerifier.verifyIdToken(
					body.idToken,
				);
				const account =
					await dependencies.accountMappingService.mapVerifiedToken(
						verifiedToken,
					);
				const ttlSeconds =
					dependencies.sessionTtlSeconds ?? DEFAULT_SESSION_TTL_SECONDS;
				const claims = createAppSessionClaims(
					{
						accountId: account.accountId,
						customerId: account.customerId,
						isAdmin: account.isAdmin,
						emailVerified:
							verifiedToken.emailVerified &&
							account.emailVerifiedAt !== undefined,
						role: account.role,
					},
					{
						now: dependencies.now?.() ?? new Date(),
						ttlSeconds,
					},
				);
				const sessionToken = dependencies.sessionCodec.sign(claims);
				const response = NextResponse.json({
					authenticated: true,
					account: {
						accountId: account.accountId,
						customerId: account.customerId,
						email: account.customerEmail,
						emailVerified:
							verifiedToken.emailVerified &&
							account.emailVerifiedAt !== undefined,
						isAdmin: account.isAdmin,
						role: account.role,
					},
				});

				response.headers.set(
					"Set-Cookie",
					buildSessionCookieHeader(sessionToken, {
						maxAgeSeconds: ttlSeconds,
						secure: dependencies.secureCookies ?? options.secureCookies,
					}),
				);

				return response;
			} catch (error) {
				return createAuthSessionErrorResponse(error);
			}
		},

		DELETE(): NextResponse {
			const response = new NextResponse(null, { status: 204 });
			response.headers.set(
				"Set-Cookie",
				buildClearSessionCookieHeader({ secure: options.secureCookies }),
			);
			return response;
		},
	};
}

export async function createProductionAuthSessionDependencies(): Promise<AuthSessionRouteDependencies> {
	const [
		{ db },
		{ createDrizzleCustomerAccountRepository },
		{ createFirebaseTokenVerifier },
	] = await Promise.all([
		import("../../../../db/client"),
		import("../../../../db/customer-account-repository"),
		import("../../../../services/firebase-auth"),
	]);

	const statusDependencies = createProductionAuthSessionStatusDependencies();

	return {
		tokenVerifier: createFirebaseTokenVerifier({
			projectId: serverEnv.FIREBASE_PROJECT_ID,
		}),
		accountMappingService: new AuthAccountMappingService(
			createDrizzleCustomerAccountRepository(db),
		),
		...statusDependencies,
	};
}

export function createProductionAuthSessionStatusDependencies(): AuthSessionStatusDependencies {
	if (!serverEnv.SESSION_SECRET) {
		throw new AppSessionConfigurationError("SESSION_SECRET is required");
	}

	return {
		sessionCodec: createHmacAppSessionCodec({
			secret: serverEnv.SESSION_SECRET,
		}),
		secureCookies: serverEnv.NODE_ENV === "production",
	};
}

export function shouldUseSecureAuthCookies(): boolean {
	return serverEnv.NODE_ENV === "production";
}

type SessionRequestBody = Readonly<{ idToken: string }>;

type PublicAppSession = Readonly<{
	accountId: string;
	customerId: string;
	emailVerified: boolean;
	isAdmin: boolean;
	role?: string;
	issuedAt: number;
	expiresAt: number;
}>;

function toPublicSession(claims: AppSessionClaims): PublicAppSession {
	return {
		accountId: claims.accountId,
		customerId: claims.customerId,
		emailVerified: claims.emailVerified,
		isAdmin: claims.isAdmin,
		role: claims.role,
		issuedAt: claims.issuedAt,
		expiresAt: claims.expiresAt,
	};
}

function createUnauthenticatedSessionResponse(
	options: Readonly<{ clearCookie?: boolean; secureCookies?: boolean }> = {},
): NextResponse {
	const response = NextResponse.json({ authenticated: false });

	if (options.clearCookie) {
		response.headers.set(
			"Set-Cookie",
			buildClearSessionCookieHeader({ secure: options.secureCookies }),
		);
	}

	return response;
}

async function readSessionRequestBody(
	request: Request,
): Promise<SessionRequestBody> {
	let body: unknown;

	try {
		body = await request.json();
	} catch {
		throw new InvalidSessionRequestError("Request body must be valid JSON");
	}

	if (!isRecord(body) || typeof body.idToken !== "string") {
		throw new InvalidSessionRequestError("idToken is required");
	}

	const idToken = body.idToken.trim();

	if (idToken.length === 0) {
		throw new InvalidSessionRequestError("idToken is required");
	}

	return { idToken };
}

function createAuthSessionErrorResponse(error: unknown): NextResponse {
	if (error instanceof InvalidSessionRequestError) {
		return NextResponse.json({ error: error.message }, { status: 400 });
	}

	if (error instanceof AuthTokenVerificationError) {
		return NextResponse.json(
			{ error: "Invalid authentication token" },
			{ status: 401 },
		);
	}

	if (error instanceof AuthAccountNotFoundError) {
		return NextResponse.json(
			{ error: "Account is not linked" },
			{ status: 403 },
		);
	}

	if (
		error instanceof AppSessionConfigurationError ||
		error instanceof AuthAccountMappingError
	) {
		return NextResponse.json(
			{ error: "Authentication service unavailable" },
			{ status: 500 },
		);
	}

	return NextResponse.json(
		{ error: "Authentication service unavailable" },
		{ status: 500 },
	);
}

class InvalidSessionRequestError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "InvalidSessionRequestError";
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
