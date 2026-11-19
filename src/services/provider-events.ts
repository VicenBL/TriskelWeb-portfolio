import type { ProviderEventStatus } from "../domain/states";

export type ProviderEventLog = Readonly<{
	id: string;
	provider: string;
	eventId: string;
	eventType: string;
	status: ProviderEventStatus;
	payload: unknown;
	receivedAt: Date;
	processedAt?: Date;
	errorMessage?: string;
}>;

export type ProviderEventInput = Readonly<{
	provider: string;
	eventId: string;
	eventType: string;
	payload: unknown;
	receivedAt?: Date;
}>;

export type CreateProviderEventResult = Readonly<{
	log: ProviderEventLog;
	created: boolean;
}>;

export type ProviderEventHandlerResult =
	| Readonly<{ status: "processed" }>
	| Readonly<{ status: "ignored"; reason?: string }>;

export type ProviderEventProcessingResult =
	| Readonly<{ outcome: "processed"; log: ProviderEventLog }>
	| Readonly<{ outcome: "ignored"; log: ProviderEventLog }>
	| Readonly<{ outcome: "duplicate"; log: ProviderEventLog }>;

export type ProviderEventHandler = (
	log: ProviderEventLog,
) =>
	| Promise<ProviderEventHandlerResult | void>
	| ProviderEventHandlerResult
	| void;

export interface ProviderEventRepository {
	createReceivedEvent(
		input: Required<ProviderEventInput>,
	): Promise<CreateProviderEventResult>;
	markProcessed(id: string, processedAt: Date): Promise<ProviderEventLog>;
	markIgnored(
		id: string,
		processedAt: Date,
		reason?: string,
	): Promise<ProviderEventLog>;
	markFailed(
		id: string,
		processedAt: Date,
		errorMessage: string,
	): Promise<ProviderEventLog>;
}

export class ProviderEventValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ProviderEventValidationError";
	}
}

export class ProviderEventIdempotencyService {
	constructor(private readonly repository: ProviderEventRepository) {}

	async recordAndHandle(
		input: ProviderEventInput,
		handler: ProviderEventHandler,
	): Promise<ProviderEventProcessingResult> {
		const normalizedInput = normalizeInput(input);
		const { log, created } =
			await this.repository.createReceivedEvent(normalizedInput);

		if (!created) {
			return { outcome: "duplicate", log };
		}

		try {
			const handlerResult = await handler(log);
			const processedAt = new Date();

			if (handlerResult?.status === "ignored") {
				return {
					outcome: "ignored",
					log: await this.repository.markIgnored(
						log.id,
						processedAt,
						handlerResult.reason,
					),
				};
			}

			return {
				outcome: "processed",
				log: await this.repository.markProcessed(log.id, processedAt),
			};
		} catch (error) {
			await this.repository.markFailed(
				log.id,
				new Date(),
				formatErrorMessage(error),
			);
			throw error;
		}
	}
}

function normalizeInput(
	input: ProviderEventInput,
): Required<ProviderEventInput> {
	assertNonEmpty(input.provider, "provider");
	assertNonEmpty(input.eventId, "eventId");
	assertNonEmpty(input.eventType, "eventType");

	const receivedAt = input.receivedAt ?? new Date();

	if (!(receivedAt instanceof Date) || Number.isNaN(receivedAt.getTime())) {
		throw new ProviderEventValidationError("receivedAt must be a valid date");
	}

	return {
		provider: input.provider.trim(),
		eventId: input.eventId.trim(),
		eventType: input.eventType.trim(),
		payload: input.payload,
		receivedAt,
	};
}

function assertNonEmpty(value: string, fieldName: string): void {
	if (value.trim().length === 0) {
		throw new ProviderEventValidationError(`${fieldName} must be non-empty`);
	}
}

function formatErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
