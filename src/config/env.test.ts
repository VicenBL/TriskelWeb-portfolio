import { describe, expect, it } from "vitest";
import { parseServerEnv } from "./env";

describe("parseServerEnv", () => {
	it("uses safe defaults for local development", () => {
		const env = parseServerEnv({});

		expect(env.NODE_ENV).toBe("development");
		expect(env.SMTP_PORT).toBe(587);
	});

	it("normalizes empty optional secrets to undefined", () => {
		const env = parseServerEnv({ DATABASE_URL: "", STRIPE_SECRET_KEY: "" });

		expect(env.DATABASE_URL).toBeUndefined();
		expect(env.STRIPE_SECRET_KEY).toBeUndefined();
	});

	it("rejects invalid application base URLs", () => {
		expect(() => parseServerEnv({ APP_BASE_URL: "not-a-url" })).toThrow();
	});
});
