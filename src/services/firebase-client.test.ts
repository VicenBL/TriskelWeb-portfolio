import { describe, expect, it } from "vitest";
import {
	FirebaseClientConfigurationError,
	readPublicFirebaseConfig,
} from "./firebase-client";

describe("readPublicFirebaseConfig", () => {
	it("maps the public Firebase web app config", () => {
		expect(
			readPublicFirebaseConfig({
				NEXT_PUBLIC_FIREBASE_API_KEY: "api-key",
				NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "triskel.firebaseapp.com",
				NEXT_PUBLIC_FIREBASE_PROJECT_ID: "triskel-project",
				NEXT_PUBLIC_FIREBASE_APP_ID: "app-id",
			}),
		).toEqual({
			apiKey: "api-key",
			authDomain: "triskel.firebaseapp.com",
			projectId: "triskel-project",
			appId: "app-id",
		});
	});

	it("fails with clear missing public config names", () => {
		expect(() =>
			readPublicFirebaseConfig({
				NEXT_PUBLIC_FIREBASE_API_KEY: "api-key",
				NEXT_PUBLIC_FIREBASE_PROJECT_ID: "triskel-project",
			}),
		).toThrow(FirebaseClientConfigurationError);
		expect(() =>
			readPublicFirebaseConfig({
				NEXT_PUBLIC_FIREBASE_API_KEY: "api-key",
				NEXT_PUBLIC_FIREBASE_PROJECT_ID: "triskel-project",
			}),
		).toThrow(
			"Missing Firebase public config: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, NEXT_PUBLIC_FIREBASE_APP_ID",
		);
	});
});
