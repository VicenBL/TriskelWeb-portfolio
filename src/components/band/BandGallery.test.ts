import { existsSync, readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it, vi } from "vitest";
import Home from "../../app/page";

const portraits = [
	["Joseph D'Folk", "Flauta y whistles", "JOSEPH front.jpeg"],
	["Ismael Ros", "Guitarra", "ISMA front.jpeg"],
	["Manuel Conesa", "Voz", "MANU front.jpeg"],
	["Alicia Trillo", "Violín", "ALICIA sentada.jpeg"],
	["Vicente B. «Mesi»", "Guitarra", "MESI front.jpeg"],
	["Fernando García", "Bajo", "FERNANDO front.jpeg"],
	["Fátima G «Faty»", "Percusión", "FATIMA front.jpeg"],
];
vi.mock("../../services/preview-page-guard", () => ({ requirePreviewPage: vi.fn(async () => false) }));
let homeMarkup: Awaited<ReturnType<typeof Home>>;
beforeAll(async () => { homeMarkup = await Home(); });
const gallery = () => renderToStaticMarkup(homeMarkup).replace(/&#x27;/g, "'").match(/<section[^>]*id="galeria"[\s\S]*?<\/section>/)?.[0] ?? "";
const cssUrl = new URL("./gallery.module.css", import.meta.url);
const css = () => existsSync(cssUrl) ? readFileSync(cssUrl, "utf8") : "";

describe("editorial band gallery", () => {
	it.each(portraits)("maps %s and their confirmed role to the supplied filename", (name, role, file) => {
		const html = gallery();
		expect(html).toContain(`href="/images/banda/${file}"`);
		expect(html).toContain(`Ampliar retrato de ${name}, ${role.toLowerCase()}`);
		expect(html).toContain(`>${name}</span>`);
		expect(html).toContain(`>${role}</span>`);
		expect(existsSync(new URL(`../../../public/images/banda/${file}`, import.meta.url))).toBe(true);
	});

	it("shows exactly seven guarded lazy portraits and captions, not group-photo fillers", () => {
		const html = gallery();
		expect(html.match(/<img /g)).toHaveLength(7);
		expect(html.match(/loading="lazy"/g)).toHaveLength(7);
		expect(html.match(/<figcaption[ >]/g)).toHaveLength(7);
		expect(html.match(/sizes="\(max-width: 700px\)/g)).toHaveLength(7);
		expect(html.match(/src="\/images\/banda\//g)).toHaveLength(7);
		expect(html).not.toMatch(/triskel-promocional|<details|<iframe|<video/);
		for (const image of html.matchAll(/<img [^>]+>/g)) expect(image[0]).toMatch(/alt="[^"]+Triskel[^"]+"/);
	});

	it("exposes individual desktop/mobile crop values without destructive derivatives", () => {
		const html = gallery();
		expect(html.match(/--portrait-position:/g)).toHaveLength(7);
		expect(html.match(/--portrait-mobile-position:/g)).toHaveLength(7);
		expect(new Set([...html.matchAll(/--portrait-mobile-position:([^;"<]+)/g)].map(m => m[1])).size).toBeGreaterThan(4);
		expect(css()).toContain("object-fit: cover");
		expect(css()).toContain("var(--portrait-mobile-position)");
		expect(css()).not.toMatch(/filter:|backdrop-filter:/);
	});

	it("uses a two-row editorial desktop mosaic and compact two-column mobile layout", () => {
		expect(css()).toMatch(/grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/);
		expect(css()).toContain("grid-row: span 2");
		expect(css()).toMatch(/@media \(max-width: 700px\)[\s\S]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
		expect(css()).toContain("grid-column: 1 / -1");
	});

	it("keeps member names available by default and limits optional hover hiding to fine-pointer desktop", () => {
		expect(css()).toMatch(/@media \(min-width: 1024px\) and \(hover: hover\) and \(pointer: fine\)/);
		expect(css()).toContain(":focus-within");
		expect(css()).toContain(":focus-visible");
		expect(css()).toContain("prefers-reduced-motion: no-preference");
		expect(css()).toContain("overflow-wrap: anywhere");
	});

	it("keeps ordinary original-photo links as fallback and ships one initially closed native viewer", () => {
		const html = gallery();
		expect(html.match(/aria-haspopup="dialog"/g)).toHaveLength(7);
		expect(html.match(/<dialog[ >]/g)).toHaveLength(1);
		expect(html).not.toMatch(/<dialog[^>]*\sopen/);
		expect(html).toContain('aria-label="Cerrar fotografía"');
		expect(html).toContain('aria-label="Fotografía anterior"');
		expect(html).toContain('aria-label="Fotografía siguiente"');
	});
});
