import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PublicHeader } from "./PublicHeader";

const readStyles = () => readFileSync(new URL("./public.module.css", import.meta.url), "utf8");

describe("public header navigation", () => {
	it("lets only the mobile logo slot shrink when enlarged menu text needs room", () => {
		const mobile = readStyles().split("@media (max-width: 1023px)")[1] ?? "";
		expect(mobile).toMatch(/\.homeLink\s*\{[^}]*flex-basis: 120px;[^}]*flex-shrink: 1;[^}]*min-width: 0/s);
		expect(mobile).toMatch(/\.homeLink img\s*\{[^}]*width: 100%/s);
	});

	it("keeps all six navigation links and their real section destinations", () => {
		const html = renderToStaticMarkup(createElement(PublicHeader));
		const nav = html.match(/<nav[^>]*aria-label="Navegación principal"[^>]*>([\s\S]*?)<\/nav>/)?.[1] ?? "";
		expect([...nav.matchAll(/<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g)].map(([, href, label]) => [href, label])).toEqual([
			["#inicio", "Inicio"],
			["#biografia", "Biografía"],
			["#musica", "Música"],
			["#galeria", "Galería"],
			["#dossier", "Contratación"],
			["#tienda", "Tienda"],
		]);
	});

	it("adds a localized, non-intercepting glow and subtle motion only for desktop hover or visible focus", () => {
		const css = readStyles();
		expect(css).toMatch(/@media\s*\(min-width:\s*1024px\)\s*and\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)/);
		const glow = css.match(/\.desktopNav a::before\s*\{([^}]*)\}/s)?.[1] ?? "";
		expect(glow).toContain('content: ""');
		expect(glow).toContain("pointer-events: none");
		expect(glow).toContain("radial-gradient(ellipse");
		expect(glow).toContain("rgb(204 154 85 / 32%)");
		expect(glow).toContain("rgb(180 103 49 / 18%)");
		expect(css).toMatch(/\.desktopNav a:hover::before,\s*\.desktopNav a:focus-visible::before\s*\{[^}]*transform:\s*scale\(1\.12\)/s);
		expect(css).toContain("transform-origin: center");
		expect(css).toMatch(/\.desktopNav a:hover::before,\s*\.desktopNav a:focus-visible::before\s*\{[^}]*opacity:\s*1/s);
		expect(css).toMatch(/\.desktopNav a:hover,\s*\.desktopNav a:focus-visible\s*\{[^}]*transform:\s*scale\(1\.10\)/s);
		expect(css).toMatch(/transition:\s*(opacity|transform)[^;]*240ms/);
		expect(css).toContain("prefers-reduced-motion: no-preference");
		expect(css).toMatch(/\.header :focus-visible[^}]*outline:\s*2px/);
		expect(css).toMatch(/\.desktopNav a\s*\{[^}]*min-height:\s*44px/s);
	});
});
