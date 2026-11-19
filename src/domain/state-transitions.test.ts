import { describe, expect, it } from "vitest";
import {
	InvalidStateTransitionError,
	assertOrderStatusTransition,
	assertPaymentStatusTransition,
	assertShipmentStatusTransition,
	assertStockReservationStatusTransition,
	canTransitionOrderStatus,
	canTransitionPaymentStatus,
	canTransitionShipmentStatus,
	canTransitionStockReservationStatus,
} from "./state-transitions";

describe("state transition guards", () => {
	it("allows expected order progressions and rejects forbidden jumps", () => {
		expect(canTransitionOrderStatus("pending_payment", "paid")).toBe(true);
		expect(canTransitionOrderStatus("paid", "preparing")).toBe(true);
		expect(canTransitionOrderStatus("pending_payment", "shipped")).toBe(false);
		expect(() =>
			assertOrderStatusTransition("pending_payment", "shipped"),
		).toThrow(InvalidStateTransitionError);
	});

	it("keeps order terminal states terminal", () => {
		expect(canTransitionOrderStatus("cancelled", "paid")).toBe(false);
		expect(canTransitionOrderStatus("expired", "pending_payment")).toBe(false);
		expect(canTransitionOrderStatus("refunded", "paid")).toBe(false);
	});

	it("allows expected payment progressions and rejects provider-specific jumps", () => {
		expect(canTransitionPaymentStatus("not_started", "pending")).toBe(true);
		expect(canTransitionPaymentStatus("pending", "confirmed")).toBe(true);
		expect(canTransitionPaymentStatus("confirmed", "refunded")).toBe(true);
		expect(canTransitionPaymentStatus("not_started", "confirmed")).toBe(false);
		expect(() =>
			assertPaymentStatusTransition("not_started", "confirmed"),
		).toThrow(InvalidStateTransitionError);
	});

	it("keeps payment terminal states terminal", () => {
		expect(canTransitionPaymentStatus("failed", "pending")).toBe(false);
		expect(canTransitionPaymentStatus("expired", "pending")).toBe(false);
		expect(canTransitionPaymentStatus("cancelled", "pending")).toBe(false);
		expect(canTransitionPaymentStatus("refunded", "confirmed")).toBe(false);
	});

	it("allows the stock reservation lifecycle and rejects terminal changes", () => {
		expect(canTransitionStockReservationStatus("none", "reserved")).toBe(true);
		expect(canTransitionStockReservationStatus("reserved", "committed")).toBe(
			true,
		);
		expect(canTransitionStockReservationStatus("reserved", "released")).toBe(
			true,
		);
		expect(canTransitionStockReservationStatus("reserved", "expired")).toBe(
			true,
		);
		expect(canTransitionStockReservationStatus("released", "committed")).toBe(
			false,
		);
		expect(() =>
			assertStockReservationStatusTransition("expired", "committed"),
		).toThrow(InvalidStateTransitionError);
	});

	it("allows provider-neutral shipment progressions and rejects terminal changes", () => {
		expect(canTransitionShipmentStatus("pending", "preparing")).toBe(true);
		expect(canTransitionShipmentStatus("preparing", "label_created")).toBe(
			true,
		);
		expect(canTransitionShipmentStatus("label_created", "shipped")).toBe(true);
		expect(canTransitionShipmentStatus("shipped", "delivered")).toBe(true);
		expect(canTransitionShipmentStatus("delivered", "shipped")).toBe(false);
		expect(canTransitionShipmentStatus("not_required", "pending")).toBe(false);
		expect(() =>
			assertShipmentStatusTransition("delivered", "shipped"),
		).toThrow(InvalidStateTransitionError);
	});
});
