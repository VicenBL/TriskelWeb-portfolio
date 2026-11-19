import { createSign, generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { AuthTokenVerificationError } from "./auth-tokens";
import {
	createFirebaseTokenVerifier,
	FirebaseAuthConfigurationError,
} from "./firebase-auth";

const now = new Date("2026-01-01T00:30:00.000Z");
const nowSeconds = Math.floor(now.getTime() / 1000);

describe("createFirebaseTokenVerifier", () => {
	it("verifies Firebase ID token signature and claims", async () => {
		const keys = createTestKeys();
		const verifier = createFirebaseTokenVerifier({
			projectId: "triskelweb-dev",
			now: () => now,
			fetcher: certificateFetcher(keys.publicKeyPem),
		});
		const token = signJwt(keys.privateKeyPem, {
			aud: "triskelweb-dev",
			exp: nowSeconds + 3600,
			iat: nowSeconds - 60,
			iss: "https://securetoken.google.com/triskelweb-dev",
			sub: "firebase-user-1",
			email: "customer@example.com",
			email_verified: true,
		});

		await expect(verifier.verifyIdToken(token)).resolves.toMatchObject({
			provider: "firebase",
			uid: "firebase-user-1",
			email: "customer@example.com",
			emailVerified: true,
		});
	});

	it("rejects tokens for a different Firebase project", async () => {
		const keys = createTestKeys();
		const verifier = createFirebaseTokenVerifier({
			projectId: "triskelweb-dev",
			now: () => now,
			fetcher: certificateFetcher(keys.publicKeyPem),
		});
		const token = signJwt(keys.privateKeyPem, {
			aud: "other-project",
			exp: nowSeconds + 3600,
			iat: nowSeconds - 60,
			iss: "https://securetoken.google.com/other-project",
			sub: "firebase-user-1",
		});

		await expect(verifier.verifyIdToken(token)).rejects.toThrow(
			AuthTokenVerificationError,
		);
	});

	it("requires a Firebase project id", () => {
		expect(() => createFirebaseTokenVerifier({ projectId: " " })).toThrow(
			FirebaseAuthConfigurationError,
		);
	});
});

function createTestKeys(): Readonly<{
	privateKeyPem: string;
	publicKeyPem: string;
}> {
	const { privateKey, publicKey } = generateKeyPairSync("rsa", {
		modulusLength: 2048,
	});

	return {
		privateKeyPem: privateKey
			.export({ format: "pem", type: "pkcs8" })
			.toString(),
		publicKeyPem: publicKey.export({ format: "pem", type: "spki" }).toString(),
	};
}

function certificateFetcher(publicKeyPem: string): typeof fetch {
	return async () =>
		new Response(JSON.stringify({ testkid: publicKeyPem }), {
			headers: { "cache-control": "public, max-age=3600" },
		});
}

function signJwt(
	privateKeyPem: string,
	payload: Readonly<Record<string, unknown>>,
): string {
	const encodedHeader = encodeJson({ alg: "RS256", kid: "testkid" });
	const encodedPayload = encodeJson(payload);
	const signingInput = `${encodedHeader}.${encodedPayload}`;
	const signature = createSign("RSA-SHA256")
		.update(signingInput)
		.sign(privateKeyPem, "base64url");

	return `${signingInput}.${signature}`;
}

function encodeJson(value: Readonly<Record<string, unknown>>): string {
	return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}
