import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./music.module.css", import.meta.url), "utf8");
const rule = (selector: string) => css.match(new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]+)\\}`))?.[1] ?? "";
const declaration = (block: string, property: string) => block.match(new RegExp(`(?:^|[;\\s])${property}:\\s*(#[\\da-f]{3,6})`, "i"))?.[1];
const luminance = (color: string) => {
	const raw = color.slice(1);
	const hex = raw.length === 3 ? [...raw].map(value => value + value).join("") : raw;
	const channels = [0, 2, 4].map(offset => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255)
		.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
	return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
};

describe("special video action contrast", () => {
	it.each(["", ":hover"])("keeps readable text in the %s state", state => {
		const base = rule(".specialLink");
		const current = rule(`.specialLink${state}`);
		const foreground = declaration(current, "color") ?? declaration(base, "color");
		const background = declaration(current, "background") ?? declaration(base, "background");
		expect(foreground).toBeDefined();
		expect(background).toBeDefined();
		const values = [luminance(foreground!), luminance(background!)].sort((a, b) => b - a);
		expect((values[0] + 0.05) / (values[1] + 0.05)).toBeGreaterThanOrEqual(4.5);
	});
});
