import { assertStockReservationStatusTransition } from "../domain/state-transitions";
import type { StockReservationStatus } from "../domain/states";

export type StockMode = "finite" | "made_to_order";

export type InventoryItem = Readonly<{
	id: string;
	stockMode: StockMode;
	quantityAvailable: number;
	quantityReserved: number;
	quantityCommitted: number;
}>;

export type StockReservation = Readonly<{
	id: string;
	orderId: string;
	orderItemId: string;
	inventoryItemId: string;
	quantity: number;
	status: StockReservationStatus;
	reservedUntil: Date;
	committedAt?: Date;
	releasedAt?: Date;
	createdAt: Date;
}>;

export type CreateStockReservationInput = Readonly<{
	orderId: string;
	orderItemId: string;
	inventoryItemId: string;
	quantity: number;
	reservedUntil: Date;
}>;

export type InventoryQuantityDelta = Partial<
	Readonly<{
		quantityAvailable: number;
		quantityReserved: number;
		quantityCommitted: number;
	}>
>;

export type CreateStockReservationRecord = CreateStockReservationInput &
	Readonly<{
		status: "reserved";
		createdAt: Date;
	}>;

export type UpdateStockReservationRecord = Partial<
	Readonly<{
		status: StockReservationStatus;
		committedAt: Date;
		releasedAt: Date;
	}>
>;

export interface StockReservationRepository {
	findInventoryItemForUpdate(id: string): Promise<InventoryItem | null>;
	findReservationForUpdate(id: string): Promise<StockReservation | null>;
	createReservation(
		input: CreateStockReservationRecord,
	): Promise<StockReservation>;
	updateInventoryQuantities(
		id: string,
		delta: InventoryQuantityDelta,
	): Promise<InventoryItem>;
	updateReservation(
		id: string,
		patch: UpdateStockReservationRecord,
	): Promise<StockReservation>;
}

export interface StockReservationTransactionRunner {
	runInTransaction<T>(
		operation: (repository: StockReservationRepository) => Promise<T>,
	): Promise<T>;
}

export class StockReservationValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "StockReservationValidationError";
	}
}

export class StockReservationNotFoundError extends Error {
	constructor(resource: string, id: string) {
		super(`${resource} not found: ${id}`);
		this.name = "StockReservationNotFoundError";
	}
}

export class InsufficientStockError extends Error {
	constructor(inventoryItemId: string, requested: number, available: number) {
		super(
			`Insufficient stock for ${inventoryItemId}: requested ${requested}, available ${available}`,
		);
		this.name = "InsufficientStockError";
	}
}

export class StockReservationService {
	constructor(
		private readonly repository: StockReservationRepository,
		private readonly transactions?: StockReservationTransactionRunner,
	) {}

	async reserve(input: CreateStockReservationInput): Promise<StockReservation> {
		assertPositiveQuantity(input.quantity);
		assertValidDate(input.reservedUntil, "reservedUntil");

		return this.runInTransaction(async (repository) => {
			const inventoryItem = await findInventoryOrThrow(
				repository,
				input.inventoryItemId,
			);

			if (inventoryItem.stockMode === "finite") {
				const availableToReserve = calculateAvailableToReserve(inventoryItem);

				if (availableToReserve < input.quantity) {
					throw new InsufficientStockError(
						input.inventoryItemId,
						input.quantity,
						availableToReserve,
					);
				}

				await repository.updateInventoryQuantities(input.inventoryItemId, {
					quantityReserved: input.quantity,
				});
			}

			return repository.createReservation({
				...input,
				status: "reserved",
				createdAt: new Date(),
			});
		});
	}

	commit(reservationId: string): Promise<StockReservation> {
		return this.transitionReservation(reservationId, "committed", {
			quantityReserved: "decrease",
			quantityCommitted: "increase",
		});
	}

	release(reservationId: string): Promise<StockReservation> {
		return this.transitionReservation(reservationId, "released", {
			quantityReserved: "decrease",
		});
	}

	expire(reservationId: string): Promise<StockReservation> {
		return this.transitionReservation(reservationId, "expired", {
			quantityReserved: "decrease",
		});
	}

	private transitionReservation(
		reservationId: string,
		nextStatus: "committed" | "released" | "expired",
		finiteCounterChanges: Readonly<{
			quantityReserved?: "decrease";
			quantityCommitted?: "increase";
		}>,
	): Promise<StockReservation> {
		return this.runInTransaction(async (repository) => {
			const reservation = await findReservationOrThrow(
				repository,
				reservationId,
			);
			assertStockReservationStatusTransition(reservation.status, nextStatus);

			const inventoryItem = await findInventoryOrThrow(
				repository,
				reservation.inventoryItemId,
			);

			if (inventoryItem.stockMode === "finite") {
				await repository.updateInventoryQuantities(
					reservation.inventoryItemId,
					buildFiniteCounterDelta(reservation.quantity, finiteCounterChanges),
				);
			}

			return repository.updateReservation(reservationId, {
				status: nextStatus,
				...(nextStatus === "committed" ? { committedAt: new Date() } : {}),
				...(nextStatus === "released" || nextStatus === "expired"
					? { releasedAt: new Date() }
					: {}),
			});
		});
	}

	private runInTransaction<T>(
		operation: (repository: StockReservationRepository) => Promise<T>,
	): Promise<T> {
		if (this.transactions) {
			return this.transactions.runInTransaction(operation);
		}

		return operation(this.repository);
	}
}

function assertPositiveQuantity(quantity: number): void {
	if (!Number.isSafeInteger(quantity) || quantity <= 0) {
		throw new StockReservationValidationError(
			"Stock reservation quantity must be a positive safe integer",
		);
	}
}

function assertValidDate(value: Date, fieldName: string): void {
	if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
		throw new StockReservationValidationError(
			`${fieldName} must be a valid date`,
		);
	}
}

function calculateAvailableToReserve(inventoryItem: InventoryItem): number {
	return (
		inventoryItem.quantityAvailable -
		inventoryItem.quantityReserved -
		inventoryItem.quantityCommitted
	);
}

async function findInventoryOrThrow(
	repository: StockReservationRepository,
	inventoryItemId: string,
): Promise<InventoryItem> {
	const inventoryItem =
		await repository.findInventoryItemForUpdate(inventoryItemId);

	if (!inventoryItem) {
		throw new StockReservationNotFoundError("Inventory item", inventoryItemId);
	}

	return inventoryItem;
}

async function findReservationOrThrow(
	repository: StockReservationRepository,
	reservationId: string,
): Promise<StockReservation> {
	const reservation = await repository.findReservationForUpdate(reservationId);

	if (!reservation) {
		throw new StockReservationNotFoundError("Stock reservation", reservationId);
	}

	return reservation;
}

function buildFiniteCounterDelta(
	quantity: number,
	changes: Readonly<{
		quantityReserved?: "decrease";
		quantityCommitted?: "increase";
	}>,
): InventoryQuantityDelta {
	return {
		...(changes.quantityReserved === "decrease"
			? { quantityReserved: -quantity }
			: {}),
		...(changes.quantityCommitted === "increase"
			? { quantityCommitted: quantity }
			: {}),
	};
}
