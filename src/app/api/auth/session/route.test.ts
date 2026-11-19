import { describe, expect, it } from "vitest";
import type {
	AuthTokenVerifier,
	VerifiedAuthToken,
} from "../../../../services/auth-tokens";
import { AuthTokenVerificationError } from "../../../../services/auth-tokens";
import { AuthAccountMappingService } from "../../../../services/auth-accounts";
import type {
	AuthenticatedCustomerAccount,
	CustomerAccountRepository,
} from "../../../../services/auth-accounts";
import {
	APP_SESSION_COOKIE_NAME,
	createAppSessionClaims,
	createHmacAppSessionCodec,
} from "../../../../services/app-session";
import { createAuthSessionRouteHandlers } from "./handlers";

const sessionSecret = "test-session-secret-".repeat(2);

describe("/api/auth/session route handlers", () => {
	it("creates an HTTP-only app session after Firebase token verification and account mapping", async () => {
		const codec = createHmacAppSessionCodec({
			secret: sessionSecret,
			now: () => new Date("2026-01-01T00:30:00.000Z"),
		});
		const verifier = new FakeTokenVerifier();
		const handlers = createAuthSessionRouteHandlers(
			() => ({
				tokenVerifier: verifier,
				accountMappingService: new AuthAccountMappingService(
					new InMemoryCustomerAccountRepository([customerAccount()]),
				),
				sessionCodec: codec,
				now: () => new Date("2026-01-01T00:00:00.000Z"),
				secureCookies: true,
				sessionTtlSeconds: 3600,
			}),
			{ secureCookies: true },
		);

		const response = await handlers.POST(
			jsonRequest({ idToken: " firebase-id-token " }),
		);
		const body = await response.json();
		const cookie = response.headers.get("set-cookie");
		const sessionToken = extractSessionToken(cookie);

		expect(response.status).toBe(200);
		expect(verifier.verifiedTokens).toEqual(["firebase-id-token"]);
		expect(body).toEqual({
			authenticated: true,
			account: {
				accountId: "account-1",
				customerId: "customer-1",
				email: "customer@example.com",
				emailVerified: true,
				isAdmin: false,
				role: "customer",
			},
		});
		expect(cookie).toContain("HttpOnly");
		expect(cookie).toContain("Secure");
		expect(codec.verify(sessionToken)).toMatchObject({
			accountId: "account-1",
			customerId: "customer-1",
			emailVerified: true,
			isAdmin: false,
			role: "customer",
			issuedAt: 1767225600,
			expiresAt: 1767229200,
		});
	});

	it("marks the app session unverified when Firebase email is not verified", async () => {
		const codec = createHmacAppSessionCodec({
			secret: sessionSecret,
			now: () => new Date("2026-01-01T00:30:00.000Z"),
		});
		const handlers = createAuthSessionRouteHandlers(() => ({
			tokenVerifier: new FakeTokenVerifier({ emailVerified: false }),
			accountMappingService: new AuthAccountMappingService(
				new InMemoryCustomerAccountRepository([customerAccount()]),
			),
			sessionCodec: codec,
			now: () => new Date("2026-01-01T00:00:00.000Z"),
		}));

		const response = await handlers.POST(jsonRequest({ idToken: "id-token" }));
		const body = await response.json();
		const sessionToken = extractSessionToken(
			response.headers.get("set-cookie"),
		);

		expect(body.account.emailVerified).toBe(false);
		expect(codec.verify(sessionToken).emailVerified).toBe(false);
	});

	it("returns 400 when the Firebase id token is missing", async () => {
		const handlers = createAuthSessionRouteHandlers(() => {
			throw new Error(
				"dependencies should not be resolved for invalid requests",
			);
		});

		const response = await handlers.POST(jsonRequest({}));

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: "idToken is required" });
	});

	it("returns 401 when Firebase token verification fails", async () => {
		const handlers = createAuthSessionRouteHandlers(() => ({
			tokenVerifier: {
				async verifyIdToken() {
					throw new AuthTokenVerificationError();
				},
			},
			accountMappingService: new AuthAccountMappingService(
				new InMemoryCustomerAccountRepository([customerAccount()]),
			),
			sessionCodec: createHmacAppSessionCodec({ secret: sessionSecret }),
		}));

		const response = await handlers.POST(jsonRequest({ idToken: "bad-token" }));

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({
			error: "Invalid authentication token",
		});
	});

	it("returns unauthenticated status when the app session cookie is missing", async () => {
		const handlers = createAuthSessionRouteHandlers(() => {
			throw new Error(
				"dependencies should not be resolved when no session cookie exists",
			);
		});

		const response = await handlers.GET(sessionStatusRequest());

		expect(response.status).toBe(200);
		expect(response.headers.get("set-cookie")).toBeNull();
		expect(await response.json()).toEqual({ authenticated: false });
	});

	it("returns authenticated status for a valid app session cookie without leaking identity-provider fields", async () => {
		const codec = createHmacAppSessionCodec({
			secret: sessionSecret,
			now: () => new Date("2026-01-01T00:30:00.000Z"),
		});
		const claims = createAppSessionClaims(sessionInput(), {
			now: new Date("2026-01-01T00:00:00.000Z"),
			ttlSeconds: 3600,
		});
		const sessionToken = codec.sign(claims);
		const handlers = createAuthSessionRouteHandlers(
			() => {
				throw new Error("POST dependencies should not be used for status");
			},
			{
				resolveStatusDependencies: () => ({ sessionCodec: codec }),
			},
		);

		const response = await handlers.GET(
			sessionStatusRequest(`${APP_SESSION_COOKIE_NAME}=${sessionToken}`),
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body).toEqual({
			authenticated: true,
			session: {
				accountId: "account-1",
				customerId: "customer-1",
				emailVerified: true,
				isAdmin: false,
				role: "customer",
				issuedAt: 1767225600,
				expiresAt: 1767229200,
			},
		});
		expect(body.session).not.toHaveProperty("email");
		expect(body.session).not.toHaveProperty("firebaseUid");
	});

	it.each([
		["invalid", "not-a-valid-session-token"],
		[
			"expired",
			createHmacAppSessionCodec({ secret: sessionSecret }).sign(
				createAppSessionClaims(sessionInput(), {
					now: new Date("2026-01-01T00:00:00.000Z"),
					ttlSeconds: 1,
				}),
			),
		],
	])("clears the app session cookie for an %s app session cookie", async (_caseName, sessionToken) => {
		const codec = createHmacAppSessionCodec({
			secret: sessionSecret,
			now: () => new Date("2026-01-01T00:30:00.000Z"),
		});
		const handlers = createAuthSessionRouteHandlers(
			() => {
				throw new Error("POST dependencies should not be used for status");
			},
			{
				resolveStatusDependencies: () => ({
					sessionCodec: codec,
					secureCookies: true,
				}),
			},
		);

		const response = await handlers.GET(
			sessionStatusRequest(`${APP_SESSION_COOKIE_NAME}=${sessionToken}`),
		);
		const cookie = response.headers.get("set-cookie");

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ authenticated: false });
		expect(cookie).toContain(`${APP_SESSION_COOKIE_NAME}=`);
		expect(cookie).toContain("Max-Age=0");
		expect(cookie).toContain("HttpOnly");
		expect(cookie).toContain("Secure");
	});

	it("clears the app session cookie", async () => {
		const handlers = createAuthSessionRouteHandlers(
			() => {
				throw new Error("dependencies should not be resolved for logout");
			},
			{ secureCookies: true },
		);

		const response = handlers.DELETE();
		const cookie = response.headers.get("set-cookie");

		expect(response.status).toBe(204);
		expect(cookie).toContain("triskelweb_session=");
		expect(cookie).toContain("Max-Age=0");
		expect(cookie).toContain("HttpOnly");
		expect(cookie).toContain("Secure");
	});
});

function jsonRequest(body: unknown): Request {
	return new Request("http://localhost/api/auth/session", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

function sessionStatusRequest(cookieHeader?: string): Request {
	return new Request("http://localhost/api/auth/session", {
		method: "GET",
		headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
	});
}

function sessionInput() {
	return {
		accountId: "account-1",
		customerId: "customer-1",
		isAdmin: false,
		emailVerified: true,
		role: "customer",
	};
}

function extractSessionToken(cookie: string | null): string {
	if (!cookie) {
		throw new Error("Expected Set-Cookie header");
	}

	const [nameValue] = cookie.split(";");
	const [, token] = nameValue.split("=");

	if (!token) {
		throw new Error("Expected session token in Set-Cookie header");
	}

	return token;
}

function customerAccount(
	overrides: Partial<AuthenticatedCustomerAccount> = {},
): AuthenticatedCustomerAccount {
	return {
		accountId: "account-1",
		customerId: "customer-1",
		customerEmail: "customer@example.com",
		customerName: "Customer",
		firebaseUid: "firebase-user-1",
		emailVerifiedAt: new Date("2026-01-01T00:00:00.000Z"),
		isAdmin: false,
		role: "customer",
		...overrides,
	};
}

class FakeTokenVerifier implements AuthTokenVerifier {
	readonly verifiedTokens: string[] = [];

	constructor(private readonly token: Partial<VerifiedAuthToken> = {}) {}

	async verifyIdToken(idToken: string): Promise<VerifiedAuthToken> {
		this.verifiedTokens.push(idToken);
		return {
			provider: "firebase",
			uid: "firebase-user-1",
			email: "customer@example.com",
			emailVerified: true,
			...this.token,
		};
	}
}

class InMemoryCustomerAccountRepository implements CustomerAccountRepository {
	constructor(private readonly accounts: AuthenticatedCustomerAccount[]) {}

	async findByFirebaseUid(
		firebaseUid: string,
	): Promise<AuthenticatedCustomerAccount | null> {
		return (
			this.accounts.find((account) => account.firebaseUid === firebaseUid) ??
			null
		);
	}
}
