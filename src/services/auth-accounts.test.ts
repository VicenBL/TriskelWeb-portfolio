import { describe, expect, it } from "vitest";
import type { VerifiedAuthToken } from "./auth-tokens";
import type {
	AuthenticatedCustomerAccount,
	CustomerAccountRepository,
} from "./auth-accounts";
import {
	AuthAccountMappingError,
	AuthAccountMappingService,
	AuthAccountNotFoundError,
} from "./auth-accounts";

describe("AuthAccountMappingService", () => {
	it("maps a verified Firebase UID to an internal customer account", async () => {
		const repository = new InMemoryCustomerAccountRepository([
			customerAccount({ firebaseUid: "firebase-user-1" }),
		]);
		const service = new AuthAccountMappingService(repository);

		const account = await service.mapVerifiedToken(
			verifiedToken({ uid: " firebase-user-1 " }),
		);

		expect(account).toMatchObject({
			accountId: "account-1",
			customerId: "customer-1",
			customerEmail: "customer@example.com",
			firebaseUid: "firebase-user-1",
			isAdmin: false,
			role: "customer",
		});
	});

	it("rejects verified Firebase users without an internal account link", async () => {
		const service = new AuthAccountMappingService(
			new InMemoryCustomerAccountRepository(),
		);

		await expect(service.mapVerifiedToken(verifiedToken())).rejects.toThrow(
			AuthAccountNotFoundError,
		);
	});

	it("rejects repository results that do not match the verified UID", async () => {
		const repository: CustomerAccountRepository = {
			async findByFirebaseUid() {
				return customerAccount({ firebaseUid: "different-firebase-user" });
			},
		};
		const service = new AuthAccountMappingService(repository);

		await expect(service.mapVerifiedToken(verifiedToken())).rejects.toThrow(
			AuthAccountMappingError,
		);
	});
});

function verifiedToken(
	overrides: Partial<VerifiedAuthToken> = {},
): VerifiedAuthToken {
	return {
		provider: "firebase",
		uid: "firebase-user-1",
		email: "customer@example.com",
		emailVerified: true,
		issuedAt: new Date("2026-01-01T00:00:00.000Z"),
		expiresAt: new Date("2026-01-01T01:00:00.000Z"),
		...overrides,
	};
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

class InMemoryCustomerAccountRepository implements CustomerAccountRepository {
	constructor(private readonly accounts: AuthenticatedCustomerAccount[] = []) {}

	async findByFirebaseUid(
		firebaseUid: string,
	): Promise<AuthenticatedCustomerAccount | null> {
		return (
			this.accounts.find(
				(account) => account.firebaseUid === firebaseUid.trim(),
			) ?? null
		);
	}
}
