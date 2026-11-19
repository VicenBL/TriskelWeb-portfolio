import {
	readAppSessionCookieToken,
	type AppSessionClaims,
	type AppSessionCodec,
	verifyAppSessionCookieToken,
} from "./app-session";

export type AuthGuardDependencies = Readonly<{
	sessionCodec: AppSessionCodec;
	cookieName?: string;
}>;

type AuthGuardErrorCode =
	| "AUTHENTICATION_REQUIRED"
	| "ADMIN_REQUIRED"
	| "VERIFIED_EMAIL_REQUIRED";

class AuthGuardError extends Error {
	readonly code: AuthGuardErrorCode;
	readonly status: number;

	constructor(
		message: string,
		options: Readonly<{
			code: AuthGuardErrorCode;
			status: number;
		}>,
	) {
		super(message);
		this.name = "AuthGuardError";
		this.code = options.code;
		this.status = options.status;
	}
}

export class AuthenticationRequiredError extends AuthGuardError {
	constructor(message = "Authentication required") {
		super(message, { code: "AUTHENTICATION_REQUIRED", status: 401 });
		this.name = "AuthenticationRequiredError";
	}
}

export class AdminAuthorizationError extends AuthGuardError {
	constructor(message = "Admin access required") {
		super(message, { code: "ADMIN_REQUIRED", status: 403 });
		this.name = "AdminAuthorizationError";
	}
}

export class VerifiedEmailRequiredError extends AuthGuardError {
	constructor(message = "Verified email required") {
		super(message, { code: "VERIFIED_EMAIL_REQUIRED", status: 403 });
		this.name = "VerifiedEmailRequiredError";
	}
}

export function requireAuthenticatedSession(
	request: Request,
	dependencies: AuthGuardDependencies,
): AppSessionClaims {
	const sessionToken = readAppSessionCookieToken(
		request.headers.get("cookie"),
		{
			name: dependencies.cookieName,
		},
	);

	if (sessionToken === null) {
		throw new AuthenticationRequiredError();
	}

	const claims = verifyAppSessionCookieToken(
		sessionToken,
		dependencies.sessionCodec,
	);

	if (!claims) {
		throw new AuthenticationRequiredError();
	}

	return claims;
}

export function requireAdminSession(
	request: Request,
	dependencies: AuthGuardDependencies,
): AppSessionClaims {
	const claims = requireAuthenticatedSession(request, dependencies);

	if (claims.isAdmin !== true) {
		throw new AdminAuthorizationError();
	}

	return claims;
}

export function requireVerifiedEmailSession(
	request: Request,
	dependencies: AuthGuardDependencies,
): AppSessionClaims {
	const claims = requireAuthenticatedSession(request, dependencies);

	if (claims.emailVerified !== true) {
		throw new VerifiedEmailRequiredError();
	}

	return claims;
}
