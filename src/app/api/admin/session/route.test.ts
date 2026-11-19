import { describe, expect, it } from "vitest";
import {
	APP_SESSION_COOKIE_NAME,
	createAppSessionClaims,
	createHmacAppSessionCodec,
	type AppSessionClaims,
	type AppSessionCodec,
} from "../../../../services/app-session";
import { createAdminSessionRouteHandlers } from "./handlers";

const sessionSecret = "test-session-secret-".repeat(2);

describe("/api/admin/session route handlers", () => {
	it("returns 401 when the app session cookie is missing", async () => {
		const handlers = createAdminSessionRouteHandlers(() => {
			throw new Error(
				"dependencies should not be resolved when no session cookie exists",
			);
		});

		const response = await handlers.GET(adminSessionRequest());

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({
			error: "Authentication required",
		});
	});

	it.each([
		["invalid", "not-a-valid-session-token"],
		[
			"expired",
			createHmacAppSessionCodec({ secret: sessionSecret }).sign(
				createClaims({
					now: new Date("2026-01-01T00:00:00.000Z"),
					ttlSeconds: 1,
				}),
			),
		],
	])("returns 401 for an %s app session cookie", async (_caseName, sessionToken) => {
		const handlers = createAdminSessionRouteHandlers(() => ({
			sessionCodec: createHmacAppSessionCodec({
				secret: sessionSecret,
				now: () => new Date("2026-01-01T00:30:00.000Z"),
			}),
		}));

		const response = await handlers.GET(requestWithSessionToken(sessionToken));

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({
			error: "Authentication required",
		});
	});

	it("returns 403 for a valid non-admin app session", async () => {
		const dependencies = adminSessionDependencies();
		const response = await handlersFor(dependencies).GET(
			requestForClaims(
				createClaims({ input: { isAdmin: false } }),
				dependencies,
			),
		);

		expect(response.status).toBe(403);
		expect(await response.json()).toEqual({
			error: "Admin access required",
		});
	});

	it("returns an internal admin session for a valid admin app session without leaking identity-provider fields", async () => {
		const dependencies = adminSessionDependencies();
		const response = await handlersFor(dependencies).GET(
			requestForClaims(
				createClaims({ input: { isAdmin: true } }),
				dependencies,
			),
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body).toEqual({
			authenticated: true,
			admin: {
				accountId: "account-1",
				customerId: "customer-1",
				emailVerified: true,
				isAdmin: true,
				role: "admin",
				issuedAt: 1767225600,
				expiresAt: 1767229200,
			},
		});
		expect(body.admin).not.toHaveProperty("email");
		expect(body.admin).not.toHaveProperty("firebaseUid");
	});
});

function handlersFor(
	dependencies: Readonly<{ sessionCodec: AppSessionCodec }>,
) {
	return createAdminSessionRouteHandlers(() => dependencies);
}

function adminSessionDependencies(): Readonly<{
	sessionCodec: AppSessionCodec;
}> {
	return {
		sessionCodec: createHmacAppSessionCodec({
			secret: sessionSecret,
			now: () => new Date("2026-01-01T00:30:00.000Z"),
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
	const isAdmin = options.input?.isAdmin ?? true;

	return createAppSessionClaims(
		{
			accountId: "account-1",
			customerId: "customer-1",
			isAdmin,
			emailVerified: options.input?.emailVerified ?? true,
			role: isAdmin ? "admin" : "customer",
		},
		{
			now: options.now ?? new Date("2026-01-01T00:00:00.000Z"),
			ttlSeconds: options.ttlSeconds ?? 3600,
		},
	);
}

function requestForClaims(
	claims: AppSessionClaims,
	dependencies: Readonly<{ sessionCodec: AppSessionCodec }>,
): Request {
	return requestWithSessionToken(dependencies.sessionCodec.sign(claims));
}

function requestWithSessionToken(sessionToken: string): Request {
	return adminSessionRequest(`${APP_SESSION_COOKIE_NAME}=${sessionToken}`);
}

function adminSessionRequest(cookieHeader?: string): Request {
	return new Request("http://localhost/api/admin/session", {
		method: "GET",
		headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
	});
}
