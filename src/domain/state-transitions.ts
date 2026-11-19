import type {
	OrderStatus,
	PaymentStatus,
	ShipmentStatus,
	StockReservationStatus,
} from "./states";

export class InvalidStateTransitionError extends Error {
	constructor(entity: string, from: string, to: string) {
		super(`Invalid ${entity} transition: ${from} -> ${to}`);
		this.name = "InvalidStateTransitionError";
	}
}

export const orderStatusTransitions: Record<
	OrderStatus,
	readonly OrderStatus[]
> = {
	draft: ["pending_payment", "cancelled"],
	pending_payment: ["paid", "cancelled", "expired"],
	paid: ["preparing", "refunded"],
	preparing: ["ready_to_ship", "cancelled"],
	ready_to_ship: ["shipped", "cancelled"],
	shipped: ["delivered", "refunded"],
	delivered: ["refunded"],
	cancelled: [],
	expired: [],
	refunded: [],
};

export const paymentStatusTransitions: Record<
	PaymentStatus,
	readonly PaymentStatus[]
> = {
	not_started: ["pending", "cancelled"],
	pending: [
		"confirmed",
		"failed",
		"expired",
		"cancelled",
		"requires_manual_review",
	],
	requires_manual_review: ["confirmed", "failed", "cancelled"],
	confirmed: ["refunded"],
	failed: [],
	expired: [],
	cancelled: [],
	refunded: [],
};

export const stockReservationStatusTransitions: Record<
	StockReservationStatus,
	readonly StockReservationStatus[]
> = {
	none: ["reserved"],
	reserved: ["committed", "released", "expired"],
	committed: [],
	released: [],
	expired: [],
};

export const shipmentStatusTransitions: Record<
	ShipmentStatus,
	readonly ShipmentStatus[]
> = {
	not_required: [],
	pending: ["preparing", "cancelled"],
	preparing: ["label_created", "failed", "cancelled"],
	label_created: ["shipped", "failed", "cancelled"],
	shipped: ["in_transit", "delivered", "failed", "returned"],
	in_transit: ["delivered", "failed", "returned"],
	delivered: [],
	failed: ["returned"],
	returned: [],
	cancelled: [],
};

export function canTransitionOrderStatus(
	from: OrderStatus,
	to: OrderStatus,
): boolean {
	return orderStatusTransitions[from].includes(to);
}

export function canTransitionPaymentStatus(
	from: PaymentStatus,
	to: PaymentStatus,
): boolean {
	return paymentStatusTransitions[from].includes(to);
}

export function canTransitionStockReservationStatus(
	from: StockReservationStatus,
	to: StockReservationStatus,
): boolean {
	return stockReservationStatusTransitions[from].includes(to);
}

export function canTransitionShipmentStatus(
	from: ShipmentStatus,
	to: ShipmentStatus,
): boolean {
	return shipmentStatusTransitions[from].includes(to);
}

export function assertOrderStatusTransition(
	from: OrderStatus,
	to: OrderStatus,
): void {
	assertTransition(
		"order status",
		from,
		to,
		canTransitionOrderStatus(from, to),
	);
}

export function assertPaymentStatusTransition(
	from: PaymentStatus,
	to: PaymentStatus,
): void {
	assertTransition(
		"payment status",
		from,
		to,
		canTransitionPaymentStatus(from, to),
	);
}

export function assertStockReservationStatusTransition(
	from: StockReservationStatus,
	to: StockReservationStatus,
): void {
	assertTransition(
		"stock reservation status",
		from,
		to,
		canTransitionStockReservationStatus(from, to),
	);
}

export function assertShipmentStatusTransition(
	from: ShipmentStatus,
	to: ShipmentStatus,
): void {
	assertTransition(
		"shipment status",
		from,
		to,
		canTransitionShipmentStatus(from, to),
	);
}

function assertTransition(
	entity: string,
	from: string,
	to: string,
	allowed: boolean,
): void {
	if (!allowed) {
		throw new InvalidStateTransitionError(entity, from, to);
	}
}
