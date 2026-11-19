import { describe, expect, it } from "vitest";
import {
	APP_SESSION_COOKIE_NAME,
	createAppSessionClaims,
	createHmacAppSessionCodec,
	type AppSessionClaims,
	type AppSessionCodec,
} from "./app-session";
import {
	AdminAuthorizationError,
	AuthenticationRequiredError,
	requireAdminSession,
	requireAuthenticatedSession,
	requireVerifiedEmailSession,
	VerifiedEmailRequiredError,
} from "./auth-guards";

const sessionSecret = "test-session-secret-".repeat(2);

describe("auth route guards", () => {
	it("rejects a missing app session cookie", () => {
		const dependencies = guardDependencies();

		expect(() =>
			requireAuthenticatedSession(guardRequest(), dependencies),
		).toThrow(AuthenticationRequiredError);
		expectAuthGuardError(
			() => requireAuthenticatedSession(guardRequest(), dependencies),
			{
				code: "AUTHENTICATION_REQUIRED",
				status: 401,
			},
		);
	});

	it("rejects a blank app session cookie", () => {
		const dependencies = guardDependencies();

		expectAuthGuardError(
			() =>
				requireAuthenticatedSession(
					guardRequest(`${APP_SESSION_COOKIE_NAME}=`),
					dependencies,
				),
			{
				code: "AUTHENTICATION_REQUIRED",
				status: 401,
			},
		);
	});

	it("rejects an invalid app session token", () => {
		const dependencies = guardDependencies();

		expectAuthGuardError(
			() =>
				requireAuthenticatedSession(
					guardRequest(`${APP_SESSION_COOKIE_NAME}=not-a-valid-session-token`),
					dependencies,
				),
			{
				code: "AUTHENTICATION_REQUIRED",
				status: 401,
			},
		);
	});

	it("rejects an expired app session token", () => {
		const dependencies = guardDependencies({
			now: () => new Date("2026-01-01T00:30:00.000Z"),
		});
		const expiredToken = createHmacAppSessionCodec({
			secret: sessionSecret,
		}).sign(
			createClaims({
				now: new Date("2026-01-01T00:00:00.000Z"),
				ttlSeconds: 1,
			}),
		);

		expectAuthGuardError(
			() =>
				requireAuthenticatedSession(
					guardRequest(`${APP_SESSION_COOKIE_NAME}=${expiredToken}`),
					dependencies,
				),
			{
				code: "AUTHENTICATION_REQUIRED",
				status: 401,
			},
		);
	});

	it("returns app session claims for a valid authenticated session", () => {
		const dependencies = guardDependencies({
			now: () => new Date("2026-01-01T00:30:00.000Z"),
		});
		const claims = createClaims();
		const request = requestForClaims(claims, dependencies.sessionCodec);

		expect(requireAuthenticatedSession(request, dependencies)).toEqual(claims);
	});

	it("rejects a non-admin app session for admin guards", () => {
		const dependencies = guardDependencies({
			now: () => new Date("2026-01-01T00:30:00.000Z"),
		});
		const request = requestForClaims(
			createClaims({ input: { isAdmin: false } }),
			dependencies.sessionCodec,
		);

		expectAuthGuardError(() => requireAdminSession(request, dependencies), {
			code: "ADMIN_REQUIRED",
			status: 403,
		});
		expect(() => requireAdminSession(request, dependencies)).toThrow(
			AdminAuthorizationError,
		);
	});

	it("returns app session claims for an admin app session", () => {
		const dependencies = guardDependencies({
			now: () => new Date("2026-01-01T00:30:00.000Z"),
		});
		const claims = createClaims({ input: { isAdmin: true } });
		const request = requestForClaims(claims, dependencies.sessionCodec);

		expect(requireAdminSession(request, dependencies)).toEqual(claims);
	});

	it("rejects an unverified-email app session for verified-email guards", () => {
		const dependencies = guardDependencies({
			now: () => new Date("2026-01-01T00:30:00.000Z"),
		});
		const request = requestForClaims(
			createClaims({ input: { emailVerified: false } }),
			dependencies.sessionCodec,
		);

		expectAuthGuardError(
			() => requireVerifiedEmailSession(request, dependencies),
			{
				code: "VERIFIED_EMAIL_REQUIRED",
				status: 403,
			},
		);
		expect(() => requireVerifiedEmailSession(request, dependencies)).toThrow(
			VerifiedEmailRequiredError,
		);
	});

	it("returns app session claims for a verified-email app session", () => {
		const dependencies = guardDependencies({
			now: () => new Date("2026-01-01T00:30:00.000Z"),
		});
		const claims = createClaims({ input: { emailVerified: true } });
		const request = requestForClaims(claims, dependencies.sessionCodec);

		expect(requireVerifiedEmailSession(request, dependencies)).toEqual(claims);
	});
});

function guardDependencies(
	options: Readonly<{
		now?: () => Date;
	}> = {},
): Readonly<{ sessionCodec: AppSessionCodec }> {
	return {
		sessionCodec: createHmacAppSessionCodec({
			secret: sessionSecret,
			now: options.now,
		}),
	};
}

function createClaims(
	options: Readonly<{
		input?: Partial<{
			isAdmin: boolean;
			emailVerified: boolean;
		}>;
		now?: Date;
		ttlSeconds?: number;
	}> = {},
): AppSessionClaims {
	return createAppSessionClaims(
		{
			accountId: "account-1",
			customerId: "customer-1",
			isAdmin: options.input?.isAdmin ?? false,
			emailVerified: options.input?.emailVerified ?? true,
			role: "customer",
		},
		{
			now: options.now ?? new Date("2026-01-01T00:00:00.000Z"),
			ttlSeconds: options.ttlSeconds ?? 3600,
		},
	);
}

function requestForClaims(
	claims: AppSessionClaims,
	codec: AppSessionCodec,
): Request {
	return guardRequest(`${APP_SESSION_COOKIE_NAME}=${codec.sign(claims)}`);
}

function guardRequest(cookieHeader?: string): Request {
	return new Request("http://localhost/protected", {
		headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
	});
}

function expectAuthGuardError(
	act: () => void,
	expected: Readonly<{
		code: string;
		status: number;
	}>,
): void {
	try {
		act();
	} catch (error) {
		expect(error).toMatchObject(expected);
		return;
	}

	throw new Error("Expected auth guard error");
}
