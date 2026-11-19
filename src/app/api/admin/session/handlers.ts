import { NextResponse } from "next/server";
import {
	AdminAuthorizationError,
	AuthenticationRequiredError,
	requireAdminSession,
} from "../../../../services/auth-guards";
import {
	readAppSessionCookieToken,
	type AppSessionClaims,
} from "../../../../services/app-session";
import { type AuthSessionStatusDependencies } from "../../auth/session/handlers";

type AdminSessionRouteDependencyResolver = () =>
	| AuthSessionStatusDependencies
	| Promise<AuthSessionStatusDependencies>;

type InternalAdminSession = Readonly<{
	accountId: string;
	customerId: string;
	emailVerified: boolean;
	isAdmin: boolean;
	role?: string;
	issuedAt: number;
	expiresAt: number;
}>;

export function createAdminSessionRouteHandlers(
	resolveDependencies: AdminSessionRouteDependencyResolver,
) {
	return {
		async GET(request: Request): Promise<NextResponse> {
			if (readAppSessionCookieToken(request.headers.get("cookie")) === null) {
				return createAuthGuardErrorResponse(new AuthenticationRequiredError());
			}

			try {
				const dependencies = await resolveDependencies();
				const claims = requireAdminSession(request, dependencies);

				return NextResponse.json({
					authenticated: true,
					admin: toInternalAdminSession(claims),
				});
			} catch (error) {
				return createAuthGuardErrorResponse(error);
			}
		},
	};
}

function toInternalAdminSession(
	claims: AppSessionClaims,
): InternalAdminSession {
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

function createAuthGuardErrorResponse(error: unknown): NextResponse {
	if (error instanceof AuthenticationRequiredError) {
		return NextResponse.json({ error: error.message }, { status: 401 });
	}

	if (error instanceof AdminAuthorizationError) {
		return NextResponse.json({ error: error.message }, { status: 403 });
	}

	return NextResponse.json(
		{ error: "Admin session service unavailable" },
		{ status: 500 },
	);
}
