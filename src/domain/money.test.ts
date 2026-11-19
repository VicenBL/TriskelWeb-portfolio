import { describe, expect, it } from "vitest";
import {
	CurrencyMismatchError,
	MoneyValidationError,
	addMoney,
	createMoney,
	multiplyMoney,
	subtractMoney,
	sumMoney,
} from "./money";

describe("money helpers", () => {
	it("stores integer minor units and normalizes three-letter currency codes", () => {
		expect(createMoney(1234, "eur")).toEqual({
			amount: 1234,
			currency: "EUR",
		});
	});

	it("rejects invalid amounts", () => {
		expect(() => createMoney(12.34, "EUR")).toThrow(MoneyValidationError);
		expect(() => createMoney(-1, "EUR")).toThrow(MoneyValidationError);
		expect(() => createMoney(Number.MAX_SAFE_INTEGER + 1, "EUR")).toThrow(
			MoneyValidationError,
		);
	});

	it("rejects invalid currencies", () => {
		expect(() => createMoney(100, "EU")).toThrow(MoneyValidationError);
		expect(() => createMoney(100, "EURO")).toThrow(MoneyValidationError);
		expect(() => createMoney(100, "€€€")).toThrow(MoneyValidationError);
	});

	it("adds, subtracts, sums, and multiplies matching currencies", () => {
		const fiveEuros = createMoney(500, "EUR");
		const twoEuros = createMoney(200, "EUR");

		expect(addMoney(fiveEuros, twoEuros)).toEqual(createMoney(700, "EUR"));
		expect(subtractMoney(fiveEuros, twoEuros)).toEqual(createMoney(300, "EUR"));
		expect(sumMoney([fiveEuros, twoEuros], "EUR")).toEqual(
			createMoney(700, "EUR"),
		);
		expect(multiplyMoney(twoEuros, 3)).toEqual(createMoney(600, "EUR"));
	});

	it("rejects currency mismatches", () => {
		expect(() =>
			addMoney(createMoney(100, "EUR"), createMoney(100, "USD")),
		).toThrow(CurrencyMismatchError);
	});

	it("rejects operations that would produce invalid money", () => {
		expect(() =>
			subtractMoney(createMoney(100, "EUR"), createMoney(200, "EUR")),
		).toThrow(MoneyValidationError);
		expect(() => multiplyMoney(createMoney(100, "EUR"), 1.5)).toThrow(
			MoneyValidationError,
		);
	});
});
