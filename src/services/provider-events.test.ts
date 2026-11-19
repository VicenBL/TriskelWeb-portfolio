import { describe, expect, it } from "vitest";
import type {
	CreateProviderEventResult,
	ProviderEventInput,
	ProviderEventLog,
	ProviderEventRepository,
} from "./provider-events";
import {
	ProviderEventIdempotencyService,
	ProviderEventValidationError,
} from "./provider-events";

describe("ProviderEventIdempotencyService", () => {
	it("inserts a first provider event and runs the handler once", async () => {
		const repository = new InMemoryProviderEventRepository();
		const service = new ProviderEventIdempotencyService(repository);
		let handlerCalls = 0;

		const result = await service.recordAndHandle(providerEventInput(), () => {
			handlerCalls += 1;
		});

		expect(result.outcome).toBe("processed");
		expect(handlerCalls).toBe(1);
		expect(repository.get("stripe", "evt-1")).toMatchObject({
			status: "processed",
			payload: { type: "checkout.session.completed" },
		});
	});

	it("returns duplicate and skips the handler for repeated provider events", async () => {
		const repository = new InMemoryProviderEventRepository();
		const service = new ProviderEventIdempotencyService(repository);
		let handlerCalls = 0;
		const handler = () => {
			handlerCalls += 1;
		};

		await service.recordAndHandle(providerEventInput(), handler);
		const duplicate = await service.recordAndHandle(
			providerEventInput(),
			handler,
		);

		expect(duplicate.outcome).toBe("duplicate");
		expect(handlerCalls).toBe(1);
		expect(repository.logCount).toBe(1);
	});

	it("marks events ignored when the handler returns an ignored result", async () => {
		const repository = new InMemoryProviderEventRepository();
		const service = new ProviderEventIdempotencyService(repository);

		const result = await service.recordAndHandle(providerEventInput(), () => ({
			status: "ignored",
			reason: "event type not relevant",
		}));

		expect(result.outcome).toBe("ignored");
		expect(result.log).toMatchObject({
			status: "ignored",
			errorMessage: "event type not relevant",
		});
	});

	it("marks events failed when the handler throws and rethrows the original error", async () => {
		const repository = new InMemoryProviderEventRepository();
		const service = new ProviderEventIdempotencyService(repository);
		const failure = new Error("handler failed");

		await expect(
			service.recordAndHandle(providerEventInput(), () => {
				throw failure;
			}),
		).rejects.toThrow(failure);
		expect(repository.get("stripe", "evt-1")).toMatchObject({
			status: "failed",
			errorMessage: "handler failed",
		});
	});

	it("validates provider event identity fields", async () => {
		const repository = new InMemoryProviderEventRepository();
		const service = new ProviderEventIdempotencyService(repository);

		await expect(
			service.recordAndHandle(
				{ ...providerEventInput(), eventId: " " },
				() => undefined,
			),
		).rejects.toThrow(ProviderEventValidationError);
	});
});

function providerEventInput(
	overrides: Partial<ProviderEventInput> = {},
): ProviderEventInput {
	return {
		provider: "stripe",
		eventId: "evt-1",
		eventType: "checkout.session.completed",
		payload: { type: "checkout.session.completed" },
		receivedAt: new Date("2026-01-01T00:00:00.000Z"),
		...overrides,
	};
}

class InMemoryProviderEventRepository implements ProviderEventRepository {
	private readonly logsByProviderEvent = new Map<string, ProviderEventLog>();

	get logCount(): number {
		return this.logsByProviderEvent.size;
	}

	get(provider: string, eventId: string): ProviderEventLog | undefined {
		return this.logsByProviderEvent.get(providerEventKey(provider, eventId));
	}

	async createReceivedEvent(
		input: Required<ProviderEventInput>,
	): Promise<CreateProviderEventResult> {
		const key = providerEventKey(input.provider, input.eventId);
		const existing = this.logsByProviderEvent.get(key);

		if (existing) {
			return { log: existing, created: false };
		}

		const log: ProviderEventLog = {
			id: `provider-event-${this.logsByProviderEvent.size + 1}`,
			provider: input.provider,
			eventId: input.eventId,
			eventType: input.eventType,
			payload: input.payload,
			receivedAt: input.receivedAt,
			status: "received",
		};

		this.logsByProviderEvent.set(key, log);
		return { log, created: true };
	}

	async markProcessed(
		id: string,
		processedAt: Date,
	): Promise<ProviderEventLog> {
		return this.updateById(id, { status: "processed", processedAt });
	}

	async markIgnored(
		id: string,
		processedAt: Date,
		reason?: string,
	): Promise<ProviderEventLog> {
		return this.updateById(id, {
			status: "ignored",
			processedAt,
			errorMessage: reason,
		});
	}

	async markFailed(
		id: string,
		processedAt: Date,
		errorMessage: string,
	): Promise<ProviderEventLog> {
		return this.updateById(id, { status: "failed", processedAt, errorMessage });
	}

	private updateById(
		id: string,
		patch: Pick<ProviderEventLog, "status" | "processedAt"> &
			Partial<Pick<ProviderEventLog, "errorMessage">>,
	): ProviderEventLog {
		for (const [key, log] of this.logsByProviderEvent) {
			if (log.id === id) {
				const updated: ProviderEventLog = { ...log, ...patch };
				this.logsByProviderEvent.set(key, updated);
				return updated;
			}
		}

		throw new Error(`Provider event not found in fake: ${id}`);
	}
}

function providerEventKey(provider: string, eventId: string): string {
	return `${provider}:${eventId}`;
}
