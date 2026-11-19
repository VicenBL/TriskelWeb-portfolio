export type Money = Readonly<{
	amount: number;
	currency: string;
}>;

const currencyPattern = /^[A-Z]{3}$/;

export class MoneyValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "MoneyValidationError";
	}
}

export class CurrencyMismatchError extends Error {
	constructor(expected: string, actual: string) {
		super(`Currency mismatch: expected ${expected}, received ${actual}`);
		this.name = "CurrencyMismatchError";
	}
}

export function createMoney(amount: number, currency: string): Money {
	assertMinorUnits(amount);
	return {
		amount,
		currency: normalizeCurrency(currency),
	};
}

export function addMoney(left: Money, right: Money): Money {
	assertSameCurrency(left, right);
	return createMoney(left.amount + right.amount, left.currency);
}

export function subtractMoney(left: Money, right: Money): Money {
	assertSameCurrency(left, right);
	return createMoney(left.amount - right.amount, left.currency);
}

export function sumMoney(values: readonly Money[], currency: string): Money {
	const normalizedCurrency = normalizeCurrency(currency);
	return values.reduce(
		(total, value) => addMoney(total, value),
		createMoney(0, normalizedCurrency),
	);
}

export function multiplyMoney(value: Money, multiplier: number): Money {
	assertMultiplier(multiplier);
	return createMoney(value.amount * multiplier, value.currency);
}

export function assertSameCurrency(left: Money, right: Money): void {
	if (left.currency !== right.currency) {
		throw new CurrencyMismatchError(left.currency, right.currency);
	}
}

function normalizeCurrency(currency: string): string {
	const normalized = currency.trim().toUpperCase();

	if (!currencyPattern.test(normalized)) {
		throw new MoneyValidationError(
			"Currency must be a three-letter ISO-style code",
		);
	}

	return normalized;
}

function assertMinorUnits(amount: number): void {
	if (!Number.isSafeInteger(amount) || amount < 0) {
		throw new MoneyValidationError(
			"Money amount must be a non-negative safe integer in minor units",
		);
	}
}

function assertMultiplier(multiplier: number): void {
	if (!Number.isSafeInteger(multiplier) || multiplier < 0) {
		throw new MoneyValidationError(
			"Money multiplier must be a non-negative safe integer",
		);
	}
}
