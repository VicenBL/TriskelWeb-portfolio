export const orderStatuses = [
	"draft",
	"pending_payment",
	"paid",
	"preparing",
	"ready_to_ship",
	"shipped",
	"delivered",
	"cancelled",
	"expired",
	"refunded",
] as const;

export type OrderStatus = (typeof orderStatuses)[number];

export const paymentStatuses = [
	"not_started",
	"pending",
	"requires_manual_review",
	"confirmed",
	"failed",
	"expired",
	"cancelled",
	"refunded",
] as const;

export type PaymentStatus = (typeof paymentStatuses)[number];

export const stockReservationStatuses = [
	"none",
	"reserved",
	"committed",
	"released",
	"expired",
] as const;

export type StockReservationStatus = (typeof stockReservationStatuses)[number];

export const shipmentStatuses = [
	"not_required",
	"pending",
	"preparing",
	"label_created",
	"shipped",
	"in_transit",
	"delivered",
	"failed",
	"returned",
	"cancelled",
] as const;

export type ShipmentStatus = (typeof shipmentStatuses)[number];

export const providerEventStatuses = [
	"received",
	"processed",
	"ignored",
	"failed",
] as const;

export type ProviderEventStatus = (typeof providerEventStatuses)[number];
