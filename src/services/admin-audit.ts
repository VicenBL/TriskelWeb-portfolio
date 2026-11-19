export type AdminAuditLog = Readonly<{
	id: string;
	actorAccountId?: string;
	action: string;
	resourceType: string;
	resourceId?: string;
	previousState?: string;
	nextState?: string;
	note?: string;
	providerReferenceId?: string;
	createdAt: Date;
}>;

export type AdminAuditInput = Readonly<{
	actorAccountId?: string;
	action: string;
	resourceType: string;
	resourceId?: string;
	previousState?: string;
	nextState?: string;
	note?: string;
	providerReferenceId?: string;
}>;

export type AdminStateChangeAuditInput = Readonly<{
	actorAccountId?: string;
	action?: string;
	resourceType: string;
	resourceId?: string;
	previousState: string;
	nextState: string;
	note?: string;
	providerReferenceId?: string;
}>;

export type CreateAdminAuditRecord = AdminAuditInput &
	Readonly<{
		createdAt: Date;
	}>;

export interface AdminAuditRepository {
	createAuditLog(input: CreateAdminAuditRecord): Promise<AdminAuditLog>;
}

export class AdminAuditValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "AdminAuditValidationError";
	}
}

export class AdminAuditService {
	constructor(private readonly repository: AdminAuditRepository) {}

	async log(input: AdminAuditInput): Promise<AdminAuditLog> {
		return this.repository.createAuditLog({
			...normalizeAuditInput(input),
			createdAt: new Date(),
		});
	}

	logStateChange(input: AdminStateChangeAuditInput): Promise<AdminAuditLog> {
		assertNonEmpty(input.previousState, "previousState");
		assertNonEmpty(input.nextState, "nextState");

		return this.log({
			...input,
			action:
				input.action ?? `${normalizeToken(input.resourceType)}.state_changed`,
			previousState: input.previousState.trim(),
			nextState: input.nextState.trim(),
		});
	}
}

function normalizeAuditInput(input: AdminAuditInput): AdminAuditInput {
	assertNonEmpty(input.action, "action");
	assertNonEmpty(input.resourceType, "resourceType");

	return {
		actorAccountId: input.actorAccountId,
		action: input.action.trim(),
		resourceType: input.resourceType.trim(),
		resourceId: input.resourceId,
		previousState: input.previousState?.trim(),
		nextState: input.nextState?.trim(),
		note: input.note?.trim(),
		providerReferenceId: input.providerReferenceId,
	};
}

function normalizeToken(value: string): string {
	return value.trim().toLowerCase().replaceAll(/\s+/g, "_");
}

function assertNonEmpty(value: string, fieldName: string): void {
	if (value.trim().length === 0) {
		throw new AdminAuditValidationError(`${fieldName} must be non-empty`);
	}
}
