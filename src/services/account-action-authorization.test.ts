import { describe, expect, it } from "vitest";
import {
	APP_SESSION_COOKIE_NAME,
	createAppSessionClaims,
	createHmacAppSessionCodec,
	type AppSessionClaims,
	type AppSessionCodec,
} from "./app-session";
import {
	AuthenticationRequiredError,
	VerifiedEmailRequiredError,
} from "./auth-guards";
import {
	AccountActionAuthorizationError,
	authorizeSensitiveAccountAction,
} from "./account-action-authorization";

const sessionSecret = "test-session-secret-".repeat(2);
const currentTime = new Date("2026-01-01T00:30:00.000Z");

const sensitiveAccountActionTarget = {
	accountId: "account-1",
};

describe("authorizeSensitiveAccountAction", () => {
	it("rejects a missing app session", () => {
		const dependencies = authorizationDependencies();

		expect(() =>
			authorizeSensitiveAccountAction(
				actionRequest(),
				sensitiveAccountActionTarget,
				dependencies,
			),
		).toThrow(AuthenticationRequiredError);
	});

	it("rejects an invalid app session", () => {
		const dependencies = authorizationDependencies();

		expect(() =>
			authorizeSensitiveAccountAction(
				actionRequest(`${APP_SESSION_COOKIE_NAME}=not-a-valid-session-token`),
				sensitiveAccountActionTarget,
				dependencies,
			),
		).toThrow(AuthenticationRequiredError);
	});

	it("rejects an expired app session", () => {
		const dependencies = authorizationDependencies();
		const expiredToken = createHmacAppSessionCodec({
			secret: sessionSecret,
		}).sign(
			createClaims({
				now: new Date("2026-01-01T00:00:00.000Z"),
				ttlSeconds: 1,
			}),
		);

		expect(() =>
			authorizeSensitiveAccountAction(
				actionRequest(`${APP_SESSION_COOKIE_NAME}=${expiredToken}`),
				sensitiveAccountActionTarget,
				dependencies,
			),
		).toThrow(AuthenticationRequiredError);
	});

	it("rejects an unverified-email app session", () => {
		const dependencies = authorizationDependencies();
		const claims = createClaims({ input: { emailVerified: false } });

		expect(() =>
			authorizeSensitiveAccountAction(
				requestForClaims(claims, dependencies.sessionCodec),
				sensitiveAccountActionTarget,
				dependencies,
			),
		).toThrow(VerifiedEmailRequiredError);
	});

	it("rejects a verified session for a different account", () => {
		const dependencies = authorizationDependencies();
		const claims = createClaims({
			input: { accountId: "account-2", emailVerified: true },
		});

		expect(() =>
			authorizeSensitiveAccountAction(
				requestForClaims(claims, dependencies.sessionCodec),
				sensitiveAccountActionTarget,
				dependencies,
			),
		).toThrow(AccountActionAuthorizationError);
	});

	it("rejects a blank target account", () => {
		const dependencies = authorizationDependencies();
		const claims = createClaims({ input: { emailVerified: true } });

		expect(() =>
			authorizeSensitiveAccountAction(
				requestForClaims(claims, dependencies.sessionCodec),
				{ accountId: "  " },
				dependencies,
			),
		).toThrow(AccountActionAuthorizationError);
	});

	it("returns claims for a verified-email session targeting its own account", () => {
		const dependencies = authorizationDependencies();
		const claims = createClaims({ input: { emailVerified: true } });

		expect(
			authorizeSensitiveAccountAction(
				requestForClaims(claims, dependencies.sessionCodec),
				{ accountId: " account-1 " },
				dependencies,
			),
		).toEqual(claims);
	});
});

function authorizationDependencies(): Readonly<{
	sessionCodec: AppSessionCodec;
}> {
	return {
		sessionCodec: createHmacAppSessionCodec({
			secret: sessionSecret,
			now: () => currentTime,
		}),
	};
}

function createClaims(
	options: Readonly<{
		input?: Partial<{
			accountId: string;
			emailVerified: boolean;
		}>;
		now?: Date;
		ttlSeconds?: number;
	}> = {},
): AppSessionClaims {
	return createAppSessionClaims(
		{
			accountId: options.input?.accountId ?? "account-1",
			customerId: "customer-1",
			isAdmin: false,
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
	return actionRequest(`${APP_SESSION_COOKIE_NAME}=${codec.sign(claims)}`);
}

function actionRequest(cookieHeader?: string): Request {
	return new Request("http://localhost/account/sensitive-action", {
		headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
	});
}
