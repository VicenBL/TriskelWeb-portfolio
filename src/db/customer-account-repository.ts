import { eq } from "drizzle-orm";
import type { db as triskelDb } from "./client";
import { customerAccounts, customers } from "./schema";
import type {
	AuthenticatedCustomerAccount,
	CustomerAccountRepository,
} from "../services/auth-accounts";

type TriskelDb = typeof triskelDb;

export function createDrizzleCustomerAccountRepository(
	db: TriskelDb,
): CustomerAccountRepository {
	return {
		async findByFirebaseUid(
			firebaseUid: string,
		): Promise<AuthenticatedCustomerAccount | null> {
			const rows = await db
				.select({
					accountId: customerAccounts.id,
					customerId: customerAccounts.customerId,
					customerEmail: customers.email,
					customerName: customers.name,
					firebaseUid: customerAccounts.firebaseUid,
					emailVerifiedAt: customerAccounts.emailVerifiedAt,
					isAdmin: customerAccounts.isAdmin,
					role: customerAccounts.role,
				})
				.from(customerAccounts)
				.innerJoin(customers, eq(customerAccounts.customerId, customers.id))
				.where(eq(customerAccounts.firebaseUid, firebaseUid))
				.limit(1);
			const row = rows[0];

			if (!row) {
				return null;
			}

			return {
				accountId: row.accountId,
				customerId: row.customerId,
				customerEmail: row.customerEmail,
				customerName: row.customerName ?? undefined,
				firebaseUid: row.firebaseUid,
				emailVerifiedAt: row.emailVerifiedAt ?? undefined,
				isAdmin: row.isAdmin,
				role: row.role ?? undefined,
			};
		},
	};
}
