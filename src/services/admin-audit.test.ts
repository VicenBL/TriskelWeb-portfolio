import { describe, expect, it } from "vitest";
import type {
	AdminAuditLog,
	AdminAuditRepository,
	CreateAdminAuditRecord,
} from "./admin-audit";
import { AdminAuditService, AdminAuditValidationError } from "./admin-audit";

describe("AdminAuditService", () => {
	it("validates non-empty action", async () => {
		const service = new AdminAuditService(new InMemoryAdminAuditRepository());

		await expect(
			service.log({
				action: " ",
				resourceType: "order",
			}),
		).rejects.toThrow(AdminAuditValidationError);
	});

	it("validates non-empty resource type", async () => {
		const service = new AdminAuditService(new InMemoryAdminAuditRepository());

		await expect(
			service.log({
				action: "order.cancel",
				resourceType: " ",
			}),
		).rejects.toThrow(AdminAuditValidationError);
	});

	it("logs audit metadata supported by the current schema", async () => {
		const repository = new InMemoryAdminAuditRepository();
		const service = new AdminAuditService(repository);

		const log = await service.log({
			actorAccountId: "admin-1",
			action: " order.cancel ",
			resourceType: " order ",
			resourceId: "order-1",
			note: " customer request ",
		});

		expect(log).toMatchObject({
			actorAccountId: "admin-1",
			action: "order.cancel",
			resourceType: "order",
			resourceId: "order-1",
			note: "customer request",
		});
		expect(log.createdAt).toBeInstanceOf(Date);
		expect(repository.logs).toHaveLength(1);
	});

	it("supports state-change audit records", async () => {
		const repository = new InMemoryAdminAuditRepository();
		const service = new AdminAuditService(repository);

		const log = await service.logStateChange({
			actorAccountId: "admin-1",
			resourceType: "order",
			resourceId: "order-1",
			previousState: "pending_payment",
			nextState: "paid",
		});

		expect(log).toMatchObject({
			action: "order.state_changed",
			resourceType: "order",
			resourceId: "order-1",
			previousState: "pending_payment",
			nextState: "paid",
		});
	});

	it("drops unsupported runtime properties before reaching the repository", async () => {
		const repository = new InMemoryAdminAuditRepository();
		const service = new AdminAuditService(repository);

		const log = await service.log({
			action: "order.cancel",
			resourceType: "order",
			payload: { unsupported: true },
		} as unknown as Parameters<AdminAuditService["log"]>[0]);

		expect("payload" in log).toBe(false);
		expect("payload" in repository.logs[0]).toBe(false);
	});
});

class InMemoryAdminAuditRepository implements AdminAuditRepository {
	readonly logs: AdminAuditLog[] = [];

	async createAuditLog(input: CreateAdminAuditRecord): Promise<AdminAuditLog> {
		const log: AdminAuditLog = {
			id: `admin-audit-${this.logs.length + 1}`,
			...input,
		};

		this.logs.push(log);
		return log;
	}
}
