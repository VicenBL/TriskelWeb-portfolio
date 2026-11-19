import { describe, expect, it } from "vitest";
import type { AdminAuditInput, AdminAuditLog } from "./admin-audit";
import {
	APP_SESSION_COOKIE_NAME,
	createAppSessionClaims,
	createHmacAppSessionCodec,
	type AppSessionClaims,
	type AppSessionCodec,
} from "./app-session";
import {
	AdminAuthorizationError,
	AuthenticationRequiredError,
} from "./auth-guards";
import {
	authorizeAdminMutation,
	type AdminMutationAuditDetails,
	type AdminMutationAuditRecorder,
} from "./admin-mutation-authorization";

const sessionSecret = "test-session-secret-".repeat(2);
const currentTime = new Date("2026-01-01T00:30:00.000Z");
const mutationAuditDetails: AdminMutationAuditDetails = {
	action: "inventory.adjust",
	resourceType: "inventory_item",
	resourceId: "inventory-item-1",
	note: "manual stock correction",
};

describe("authorizeAdminMutation", () => {
	it("rejects a missing app session without writing an audit log", async () => {
		const dependencies = authorizationDependencies();

		await expect(
			authorizeAdminMutation(
				mutationRequest(),
				mutationAuditDetails,
				dependencies,
			),
		).rejects.toThrow(AuthenticationRequiredError);
		expect(dependencies.auditService.logs).toEqual([]);
	});

	it("rejects an invalid app session without writing an audit log", async () => {
		const dependencies = authorizationDependencies();

		await expect(
			authorizeAdminMutation(
				mutationRequest(`${APP_SESSION_COOKIE_NAME}=not-a-valid-session-token`),
				mutationAuditDetails,
				dependencies,
			),
		).rejects.toThrow(AuthenticationRequiredError);
		expect(dependencies.auditService.logs).toEqual([]);
	});

	it("rejects an expired app session without writing an audit log", async () => {
		const dependencies = authorizationDependencies();
		const expiredToken = createHmacAppSessionCodec({
			secret: sessionSecret,
		}).sign(
			createClaims({
				now: new Date("2026-01-01T00:00:00.000Z"),
				ttlSeconds: 1,
			}),
		);

		await expect(
			authorizeAdminMutation(
				mutationRequest(`${APP_SESSION_COOKIE_NAME}=${expiredToken}`),
				mutationAuditDetails,
				dependencies,
			),
		).rejects.toThrow(AuthenticationRequiredError);
		expect(dependencies.auditService.logs).toEqual([]);
	});

	it("rejects a non-admin app session and writes a denial audit log", async () => {
		const dependencies = authorizationDependencies();
		const nonAdminClaims = createClaims({
			input: { accountId: "account-non-admin", isAdmin: false },
		});

		await expect(
			authorizeAdminMutation(
				requestForClaims(nonAdminClaims, dependencies.sessionCodec),
				mutationAuditDetails,
				dependencies,
			),
		).rejects.toThrow(AdminAuthorizationError);
		expect(dependencies.auditService.logs).toEqual([
			expect.objectContaining({
				actorAccountId: "account-non-admin",
				action: "inventory.adjust.denied",
				resourceType: "inventory_item",
				resourceId: "inventory-item-1",
				note: "Admin mutation denied: manual stock correction",
			}),
		]);
	});

	it("writes an allowed audit log and returns admin session claims", async () => {
		const dependencies = authorizationDependencies();
		const adminClaims = createClaims({
			input: { accountId: "account-admin", isAdmin: true },
		});

		await expect(
			authorizeAdminMutation(
				requestForClaims(adminClaims, dependencies.sessionCodec),
				mutationAuditDetails,
				dependencies,
			),
		).resolves.toEqual(adminClaims);
		expect(dependencies.auditService.logs).toEqual([
			expect.objectContaining({
				actorAccountId: "account-admin",
				action: "inventory.adjust.allowed",
				resourceType: "inventory_item",
				resourceId: "inventory-item-1",
				note: "Admin mutation allowed: manual stock correction",
			}),
		]);
	});

	it("fails closed when denial audit logging fails", async () => {
		const auditError = new Error("audit repository unavailable");
		const dependencies = {
			sessionCodec: createSessionCodec(),
			auditService: new FailingAdminAuditRecorder(auditError),
		};
		const nonAdminClaims = createClaims({
			input: { isAdmin: false },
		});

		await expect(
			authorizeAdminMutation(
				requestForClaims(nonAdminClaims, dependencies.sessionCodec),
				mutationAuditDetails,
				dependencies,
			),
		).rejects.toThrow(auditError);
	});

	it("fails closed when allowed audit logging fails", async () => {
		const auditError = new Error("audit repository unavailable");
		const dependencies = {
			sessionCodec: createSessionCodec(),
			auditService: new FailingAdminAuditRecorder(auditError),
		};
		const adminClaims = createClaims({
			input: { isAdmin: true },
		});

		await expect(
			authorizeAdminMutation(
				requestForClaims(adminClaims, dependencies.sessionCodec),
				mutationAuditDetails,
				dependencies,
			),
		).rejects.toThrow(auditError);
	});
});

function authorizationDependencies(): Readonly<{
	sessionCodec: AppSessionCodec;
	auditService: CapturingAdminAuditRecorder;
}> {
	return {
		sessionCodec: createSessionCodec(),
		auditService: new CapturingAdminAuditRecorder(),
	};
}

function createSessionCodec(): AppSessionCodec {
	return createHmacAppSessionCodec({
		secret: sessionSecret,
		now: () => currentTime,
	});
}

function createClaims(
	options: Readonly<{
		input?: Partial<{
			accountId: string;
			isAdmin: boolean;
			emailVerified: boolean;
		}>;
		now?: Date;
		ttlSeconds?: number;
	}> = {},
): AppSessionClaims {
	return createAppSessionClaims(
		{
			accountId: options.input?.accountId ?? "account-1",
			customerId: "customer-1",
			isAdmin: options.input?.isAdmin ?? false,
			emailVerified: options.input?.emailVerified ?? true,
			role: "customer",
		},
		{
			now: options.now ?? new Date("2026-01-01T00:00:00.000Z"),
			ttlSeconds: options.ttlSeconds ?? 3600,
		},
	);
}

function requestForClaims(
	claims: AppSessionClaims,
	codec: AppSessionCodec,
): Request {
	return mutationRequest(`${APP_SESSION_COOKIE_NAME}=${codec.sign(claims)}`);
}

function mutationRequest(cookieHeader?: string): Request {
	return new Request("http://localhost/admin/mutations", {
		headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
	});
}

class CapturingAdminAuditRecorder implements AdminMutationAuditRecorder {
	readonly logs: AdminAuditLog[] = [];

	async log(input: AdminAuditInput): Promise<AdminAuditLog> {
		const log: AdminAuditLog = {
			id: `admin-audit-${this.logs.length + 1}`,
			createdAt: new Date("2026-01-01T00:00:00.000Z"),
			...input,
		};

		this.logs.push(log);
		return log;
	}
}

class FailingAdminAuditRecorder implements AdminMutationAuditRecorder {
	constructor(private readonly error: Error) {}

	log(): Promise<AdminAuditLog> {
		return Promise.reject(this.error);
	}
}
