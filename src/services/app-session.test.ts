import { describe, expect, it } from "vitest";
import {
	APP_SESSION_COOKIE_NAME,
	buildClearSessionCookieHeader,
	buildSessionCookieHeader,
	createAppSessionClaims,
	createHmacAppSessionCodec,
	InvalidAppSessionError,
} from "./app-session";

const sessionSecret = "test-session-secret-".repeat(2);

describe("app session", () => {
	it("signs and verifies provider-neutral session claims", () => {
		const codec = createHmacAppSessionCodec({
			secret: sessionSecret,
			now: () => new Date("2026-01-01T00:30:00.000Z"),
		});
		const claims = createAppSessionClaims(sessionInput(), {
			now: new Date("2026-01-01T00:00:00.000Z"),
			ttlSeconds: 3600,
		});

		const token = codec.sign(claims);

		expect(codec.verify(token)).toEqual(claims);
		expect(decodedPayload(token)).toEqual({
			version: 1,
			accountId: "account-1",
			customerId: "customer-1",
			isAdmin: false,
			emailVerified: true,
			role: "customer",
			issuedAt: 1767225600,
			expiresAt: 1767229200,
		});
		expect(decodedPayload(token)).not.toHaveProperty("email");
		expect(decodedPayload(token)).not.toHaveProperty("firebaseUid");
	});

	it("rejects tampered session tokens", () => {
		const codec = createHmacAppSessionCodec({ secret: sessionSecret });
		const token = codec.sign(
			createAppSessionClaims(sessionInput(), {
				now: new Date("2026-01-01T00:00:00.000Z"),
			}),
		);

		expect(() => codec.verify(`${token}tampered`)).toThrow(
			InvalidAppSessionError,
		);
	});

	it("rejects expired session tokens", () => {
		const codec = createHmacAppSessionCodec({
			secret: sessionSecret,
			now: () => new Date("2026-01-01T02:00:00.000Z"),
		});
		const token = codec.sign(
			createAppSessionClaims(sessionInput(), {
				now: new Date("2026-01-01T00:00:00.000Z"),
				ttlSeconds: 3600,
			}),
		);

		expect(() => codec.verify(token)).toThrow(InvalidAppSessionError);
	});

	it("builds and clears HTTP-only session cookies", () => {
		const setCookie = buildSessionCookieHeader("signed-token", {
			secure: true,
			maxAgeSeconds: 3600,
		});
		const clearCookie = buildClearSessionCookieHeader({ secure: true });

		expect(setCookie).toContain(`${APP_SESSION_COOKIE_NAME}=signed-token`);
		expect(setCookie).toContain("HttpOnly");
		expect(setCookie).toContain("SameSite=Lax");
		expect(setCookie).toContain("Max-Age=3600");
		expect(setCookie).toContain("Secure");
		expect(clearCookie).toContain(`${APP_SESSION_COOKIE_NAME}=`);
		expect(clearCookie).toContain("Max-Age=0");
	});
});

function sessionInput() {
	return {
		accountId: "account-1",
		customerId: "customer-1",
		isAdmin: false,
		emailVerified: true,
		role: "customer",
	};
}

function decodedPayload(token: string): Record<string, unknown> {
	const [payload] = token.split(".");

	if (!payload) {
		throw new Error("Expected session token payload");
	}

	try {
		return JSON.parse(
			Buffer.from(payload, "base64url").toString("utf8"),
		) as Record<string, unknown>;
	} catch (error) {
		throw new Error("Expected JSON session token payload", { cause: error });
	}
}
