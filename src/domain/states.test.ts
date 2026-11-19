import { describe, expect, it } from "vitest";
import {
	orderStatuses,
	paymentStatuses,
	providerEventStatuses,
	shipmentStatuses,
	stockReservationStatuses,
} from "./states";

describe("domain state constants", () => {
	it("keeps payment states provider-neutral", () => {
		expect(paymentStatuses).toContain("confirmed");
		expect(paymentStatuses).not.toContain("stripe_checkout_completed");
	});

	it("includes the MVP order fulfillment states", () => {
		expect(orderStatuses).toEqual(
			expect.arrayContaining([
				"pending_payment",
				"paid",
				"preparing",
				"shipped",
			]),
		);
	});

	it("models stock reservations independently from providers", () => {
		expect(stockReservationStatuses).toEqual(
			expect.arrayContaining(["reserved", "committed", "released", "expired"]),
		);
	});

	it("keeps Correos details out of shipment states", () => {
		expect(shipmentStatuses).toContain("label_created");
		expect(shipmentStatuses).not.toContain("correos_preregistered");
	});

	it("tracks provider event processing without provider-specific statuses", () => {
		expect(providerEventStatuses).toEqual([
			"received",
			"processed",
			"ignored",
			"failed",
		]);
	});
});
