import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

export type PublicFirebaseConfig = Readonly<{
	apiKey: string;
	authDomain: string;
	projectId: string;
	appId: string;
}>;

type PublicFirebaseEnvKey =
	| "NEXT_PUBLIC_FIREBASE_API_KEY"
	| "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"
	| "NEXT_PUBLIC_FIREBASE_PROJECT_ID"
	| "NEXT_PUBLIC_FIREBASE_APP_ID";

const publicEnvKeys = [
	"NEXT_PUBLIC_FIREBASE_API_KEY",
	"NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
	"NEXT_PUBLIC_FIREBASE_PROJECT_ID",
	"NEXT_PUBLIC_FIREBASE_APP_ID",
] as const;

const defaultPublicFirebaseEnv: Record<
	PublicFirebaseEnvKey,
	string | undefined
> = {
	NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
	NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:
		process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
	NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
	NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export class FirebaseClientConfigurationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "FirebaseClientConfigurationError";
	}
}

export function readPublicFirebaseConfig(
	env: Record<string, string | undefined> = defaultPublicFirebaseEnv,
): PublicFirebaseConfig {
	const missingKeys = publicEnvKeys.filter((key) => !hasValue(env[key]));

	if (missingKeys.length > 0) {
		throw new FirebaseClientConfigurationError(
			`Missing Firebase public config: ${missingKeys.join(", ")}`,
		);
	}

	return {
		apiKey: readRequiredPublicEnv(env, "NEXT_PUBLIC_FIREBASE_API_KEY"),
		authDomain: readRequiredPublicEnv(env, "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
		projectId: readRequiredPublicEnv(env, "NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
		appId: readRequiredPublicEnv(env, "NEXT_PUBLIC_FIREBASE_APP_ID"),
	};
}

export function getFirebaseClientApp(
	config: PublicFirebaseConfig = readPublicFirebaseConfig(),
): FirebaseApp {
	return getApps().length > 0 ? getApp() : initializeApp(config);
}

export function getFirebaseClientAuth(): Auth {
	return getAuth(getFirebaseClientApp());
}

function readRequiredPublicEnv(
	env: Record<string, string | undefined>,
	key: PublicFirebaseEnvKey,
): string {
	const value = env[key];

	if (!hasValue(value)) {
		throw new FirebaseClientConfigurationError(
			`Missing Firebase public config: ${key}`,
		);
	}

	return value;
}

function hasValue(value: string | undefined): value is string {
	return typeof value === "string" && value.trim().length > 0;
}
