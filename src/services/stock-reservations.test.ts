import { describe, expect, it } from "vitest";
import { InvalidStateTransitionError } from "../domain/state-transitions";
import type {
	CreateStockReservationRecord,
	InventoryItem,
	InventoryQuantityDelta,
	StockReservation,
	StockReservationRepository,
	StockReservationTransactionRunner,
	UpdateStockReservationRecord,
} from "./stock-reservations";
import {
	InsufficientStockError,
	StockReservationService,
	StockReservationValidationError,
} from "./stock-reservations";

const futureDate = new Date("2030-01-01T00:00:00.000Z");

describe("StockReservationService", () => {
	it("reserves finite stock inside the injected transaction boundary", async () => {
		const repository = new InMemoryStockReservationRepository([
			finiteInventory({ quantityAvailable: 10 }),
		]);
		const service = new StockReservationService(repository, repository);

		const reservation = await service.reserve({
			orderId: "order-1",
			orderItemId: "order-item-1",
			inventoryItemId: "inventory-1",
			quantity: 3,
			reservedUntil: futureDate,
		});

		expect(repository.transactionCount).toBe(1);
		expect(reservation).toMatchObject({
			inventoryItemId: "inventory-1",
			quantity: 3,
			status: "reserved",
		});
		expect(repository.getInventory("inventory-1")).toMatchObject({
			quantityAvailable: 10,
			quantityReserved: 3,
			quantityCommitted: 0,
		});
	});

	it("rejects finite stock reservations when sellable stock is insufficient", async () => {
		const repository = new InMemoryStockReservationRepository([
			finiteInventory({ quantityAvailable: 3, quantityReserved: 1 }),
		]);
		const service = new StockReservationService(repository, repository);

		await expect(
			service.reserve({
				orderId: "order-1",
				orderItemId: "order-item-1",
				inventoryItemId: "inventory-1",
				quantity: 3,
				reservedUntil: futureDate,
			}),
		).rejects.toThrow(InsufficientStockError);
		expect(repository.reservationCount).toBe(0);
	});

	it("rejects invalid reservation quantities", async () => {
		const repository = new InMemoryStockReservationRepository([
			finiteInventory({ quantityAvailable: 10 }),
		]);
		const service = new StockReservationService(repository, repository);

		await expect(
			service.reserve({
				orderId: "order-1",
				orderItemId: "order-item-1",
				inventoryItemId: "inventory-1",
				quantity: 0,
				reservedUntil: futureDate,
			}),
		).rejects.toThrow(StockReservationValidationError);
	});

	it("commits reserved finite stock", async () => {
		const { repository, service, reservation } = await reserveFiniteStock();

		const committed = await service.commit(reservation.id);

		expect(committed.status).toBe("committed");
		expect(committed.committedAt).toBeInstanceOf(Date);
		expect(repository.getInventory("inventory-1")).toMatchObject({
			quantityAvailable: 10,
			quantityReserved: 0,
			quantityCommitted: 2,
		});
	});

	it("releases reserved finite stock", async () => {
		const { repository, service, reservation } = await reserveFiniteStock();

		const released = await service.release(reservation.id);

		expect(released.status).toBe("released");
		expect(released.releasedAt).toBeInstanceOf(Date);
		expect(repository.getInventory("inventory-1")).toMatchObject({
			quantityAvailable: 10,
			quantityReserved: 0,
			quantityCommitted: 0,
		});
	});

	it("expires reserved finite stock", async () => {
		const { repository, service, reservation } = await reserveFiniteStock();

		const expired = await service.expire(reservation.id);

		expect(expired.status).toBe("expired");
		expect(expired.releasedAt).toBeInstanceOf(Date);
		expect(repository.getInventory("inventory-1")).toMatchObject({
			quantityAvailable: 10,
			quantityReserved: 0,
			quantityCommitted: 0,
		});
	});

	it("forbids committing released or expired reservations", async () => {
		const released = await reserveFiniteStock();
		await released.service.release(released.reservation.id);

		await expect(
			released.service.commit(released.reservation.id),
		).rejects.toThrow(InvalidStateTransitionError);

		const expired = await reserveFiniteStock();
		await expired.service.expire(expired.reservation.id);

		await expect(
			expired.service.commit(expired.reservation.id),
		).rejects.toThrow(InvalidStateTransitionError);
	});

	it("treats made-to-order items as reservable without mutating finite stock counters", async () => {
		const repository = new InMemoryStockReservationRepository([
			{
				id: "inventory-1",
				stockMode: "made_to_order",
				quantityAvailable: 0,
				quantityReserved: 0,
				quantityCommitted: 0,
			},
		]);
		const service = new StockReservationService(repository, repository);

		const reservation = await service.reserve({
			orderId: "order-1",
			orderItemId: "order-item-1",
			inventoryItemId: "inventory-1",
			quantity: 25,
			reservedUntil: futureDate,
		});
		const committed = await service.commit(reservation.id);

		expect(committed.status).toBe("committed");
		expect(repository.getInventory("inventory-1")).toEqual({
			id: "inventory-1",
			stockMode: "made_to_order",
			quantityAvailable: 0,
			quantityReserved: 0,
			quantityCommitted: 0,
		});
	});
});

async function reserveFiniteStock(): Promise<{
	repository: InMemoryStockReservationRepository;
	service: StockReservationService;
	reservation: StockReservation;
}> {
	const repository = new InMemoryStockReservationRepository([
		finiteInventory({ quantityAvailable: 10 }),
	]);
	const service = new StockReservationService(repository, repository);
	const reservation = await service.reserve({
		orderId: "order-1",
		orderItemId: "order-item-1",
		inventoryItemId: "inventory-1",
		quantity: 2,
		reservedUntil: futureDate,
	});

	return { repository, service, reservation };
}

function finiteInventory(
	overrides: Partial<InventoryItem> = {},
): InventoryItem {
	return {
		id: "inventory-1",
		stockMode: "finite",
		quantityAvailable: 0,
		quantityReserved: 0,
		quantityCommitted: 0,
		...overrides,
	};
}

class InMemoryStockReservationRepository
	implements StockReservationRepository, StockReservationTransactionRunner
{
	transactionCount = 0;

	private readonly inventories = new Map<string, InventoryItem>();
	private readonly reservations = new Map<string, StockReservation>();

	constructor(inventories: readonly InventoryItem[]) {
		inventories.forEach((inventory) => {
			this.inventories.set(inventory.id, inventory);
		});
	}

	get reservationCount(): number {
		return this.reservations.size;
	}

	getInventory(id: string): InventoryItem | undefined {
		return this.inventories.get(id);
	}

	runInTransaction<T>(
		operation: (repository: StockReservationRepository) => Promise<T>,
	): Promise<T> {
		this.transactionCount += 1;
		return operation(this);
	}

	async findInventoryItemForUpdate(id: string): Promise<InventoryItem | null> {
		return this.inventories.get(id) ?? null;
	}

	async findReservationForUpdate(id: string): Promise<StockReservation | null> {
		return this.reservations.get(id) ?? null;
	}

	async createReservation(
		input: CreateStockReservationRecord,
	): Promise<StockReservation> {
		const reservation: StockReservation = {
			id: `reservation-${this.reservations.size + 1}`,
			...input,
		};

		this.reservations.set(reservation.id, reservation);
		return reservation;
	}

	async updateInventoryQuantities(
		id: string,
		delta: InventoryQuantityDelta,
	): Promise<InventoryItem> {
		const inventory = this.inventories.get(id);

		if (!inventory) {
			throw new Error(`Inventory not found in fake: ${id}`);
		}

		const updated: InventoryItem = {
			...inventory,
			quantityAvailable:
				inventory.quantityAvailable + (delta.quantityAvailable ?? 0),
			quantityReserved:
				inventory.quantityReserved + (delta.quantityReserved ?? 0),
			quantityCommitted:
				inventory.quantityCommitted + (delta.quantityCommitted ?? 0),
		};

		if (
			updated.quantityAvailable < 0 ||
			updated.quantityReserved < 0 ||
			updated.quantityCommitted < 0
		) {
			throw new Error("Inventory counters cannot be negative in fake");
		}

		this.inventories.set(id, updated);
		return updated;
	}

	async updateReservation(
		id: string,
		patch: UpdateStockReservationRecord,
	): Promise<StockReservation> {
		const reservation = this.reservations.get(id);

		if (!reservation) {
			throw new Error(`Reservation not found in fake: ${id}`);
		}

		const updated: StockReservation = {
			...reservation,
			...patch,
		};

		this.reservations.set(id, updated);
		return updated;
	}
}
