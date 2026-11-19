import type { VerifiedAuthToken } from "./auth-tokens";

export type AuthenticatedCustomerAccount = Readonly<{
	accountId: string;
	customerId: string;
	customerEmail: string;
	customerName?: string;
	firebaseUid: string;
	emailVerifiedAt?: Date;
	isAdmin: boolean;
	role?: string;
}>;

export interface CustomerAccountRepository {
	findByFirebaseUid(
		firebaseUid: string,
	): Promise<AuthenticatedCustomerAccount | null>;
}

export class AuthAccountMappingError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "AuthAccountMappingError";
	}
}

export class AuthAccountNotFoundError extends AuthAccountMappingError {
	constructor(firebaseUid: string) {
		super(
			`No internal customer account is linked to Firebase UID ${firebaseUid}`,
		);
		this.name = "AuthAccountNotFoundError";
	}
}

export class AuthAccountMappingService {
	constructor(private readonly repository: CustomerAccountRepository) {}

	async mapVerifiedToken(
		token: VerifiedAuthToken,
	): Promise<AuthenticatedCustomerAccount> {
		if (token.provider !== "firebase") {
			throw new AuthAccountMappingError("Only Firebase tokens are supported");
		}

		const firebaseUid = normalizeIdentifier(token.uid, "firebaseUid");
		const account = await this.repository.findByFirebaseUid(firebaseUid);

		if (!account) {
			throw new AuthAccountNotFoundError(firebaseUid);
		}

		return normalizeAccount(account, firebaseUid);
	}
}

function normalizeAccount(
	account: AuthenticatedCustomerAccount,
	expectedFirebaseUid: string,
): AuthenticatedCustomerAccount {
	const firebaseUid = normalizeIdentifier(account.firebaseUid, "firebaseUid");

	if (firebaseUid !== expectedFirebaseUid) {
		throw new AuthAccountMappingError(
			"Repository returned an account for a different Firebase UID",
		);
	}

	return {
		accountId: normalizeIdentifier(account.accountId, "accountId"),
		customerId: normalizeIdentifier(account.customerId, "customerId"),
		customerEmail: normalizeIdentifier(account.customerEmail, "customerEmail"),
		customerName: normalizeOptionalString(account.customerName),
		firebaseUid,
		emailVerifiedAt: account.emailVerifiedAt,
		isAdmin: account.isAdmin,
		role: normalizeOptionalString(account.role),
	};
}

function normalizeIdentifier(value: string, fieldName: string): string {
	const normalized = value.trim();

	if (normalized.length === 0) {
		throw new AuthAccountMappingError(`${fieldName} must be non-empty`);
	}

	return normalized;
}

function normalizeOptionalString(
	value: string | undefined,
): string | undefined {
	const normalized = value?.trim();
	return normalized && normalized.length > 0 ? normalized : undefined;
}
