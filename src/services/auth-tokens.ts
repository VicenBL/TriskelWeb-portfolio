export type VerifiedAuthToken = Readonly<{
	provider: "firebase";
	uid: string;
	email?: string;
	emailVerified: boolean;
	issuedAt?: Date;
	expiresAt?: Date;
}>;

export interface AuthTokenVerifier {
	verifyIdToken(idToken: string): Promise<VerifiedAuthToken>;
}

export class AuthTokenVerificationError extends Error {
	constructor(message = "Invalid authentication token") {
		super(message);
		this.name = "AuthTokenVerificationError";
	}
}

export function assertNonEmptyToken(value: string, fieldName: string): string {
	const normalized = value.trim();

	if (normalized.length === 0) {
		throw new AuthTokenVerificationError(`${fieldName} must be non-empty`);
	}

	return normalized;
}
