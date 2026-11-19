import { describe, expect, it, vi } from "vitest";
import {
	clearAppSession,
	createAppSessionFromFirebaseIdToken,
} from "./auth-session-client";

describe("auth session client", () => {
	it("posts a Firebase ID token to create an app session", async () => {
		const sessionResponse = {
			authenticated: true,
			account: {
				accountId: "account_1",
				customerId: "customer_1",
				email: "customer@example.com",
				emailVerified: true,
				isAdmin: false,
				role: "customer",
			},
		} as const;
		const fetchFn = vi.fn(async () => Response.json(sessionResponse));

		await expect(
			createAppSessionFromFirebaseIdToken("firebase-token", { fetchFn }),
		).resolves.toEqual(sessionResponse);

		expect(fetchFn).toHaveBeenCalledWith("/api/auth/session", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ idToken: "firebase-token" }),
		});
	});

	it("surfaces account linking failures from the backend bridge", async () => {
		const fetchFn = vi.fn(
			async () =>
				new Response(JSON.stringify({ error: "Account is not linked" }), {
					status: 403,
					headers: { "Content-Type": "application/json" },
				}),
		);

		await expect(
			createAppSessionFromFirebaseIdToken("firebase-token", { fetchFn }),
		).rejects.toMatchObject({
			message: "Account is not linked",
			status: 403,
		});
	});

	it("clears the app session cookie through the backend bridge", async () => {
		const fetchFn = vi.fn(async () => new Response(null, { status: 204 }));

		await expect(clearAppSession({ fetchFn })).resolves.toBeUndefined();

		expect(fetchFn).toHaveBeenCalledWith("/api/auth/session", {
			method: "DELETE",
		});
	});
});
