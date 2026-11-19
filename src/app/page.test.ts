import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it, vi } from "vitest";
import Home from "./page";
import RootLayout, { metadata } from "./layout";
import { PublicHeader } from "../components/public/PublicHeader";

vi.mock("../services/preview-page-guard", () => ({ requirePreviewPage: vi.fn(async () => false) }));
let homeMarkup: Awaited<ReturnType<typeof Home>>;
beforeAll(async () => { homeMarkup = await Home(); });
const renderHome = () => renderToStaticMarkup(homeMarkup);
const readStyles = (file: string) => readFileSync(new URL(file, import.meta.url), "utf8");

describe("public home", () => {
	it("shares section-heading hierarchy and spacing without overriding body or action roles", () => {
		const css = readStyles("./page.module.css");
		const music = readStyles("../components/music/music.module.css");
		expect(css).toContain("--section-title-size: clamp(1.8rem, 3.5vw, 3rem)");
		expect(css).toContain("--section-title-gap: clamp(1.25rem, 2vw, 1.75rem)");
		expect(css).toMatch(/\.site h2\s*\{[^}]*font-size: var\(--section-title-size\)[^}]*line-height: 1\.2[^}]*margin: 0 0 var\(--section-title-gap\)/s);
		expect(music).not.toMatch(/\.music \.heading\s*\{[^}]*font-size:/s);
		expect(css).not.toMatch(/\.shop h2\s*\{[^}]*font-size:/s);
		expect(css).toMatch(/\.bandIntroduction p\s*\{[^}]*line-height: 1\.85;[^}]*max-width: 58ch/s);
		expect(css).toMatch(/\.bandAction\s*\{[^}]*font-size: 1rem;[^}]*font-weight: 700/s);
	});

	it("preserves the confirmed identity, optimized imagery and existing destinations", () => {
		const html = renderHome();
		for (const value of ['href="#inicio"', 'href="#banda"', 'href="/login"', "Folk metal con influencias rock y celtas", "triskel-logotipo-sombra-header.png", "/images/banda/triskel-promocional"]) {
			expect(html).toContain(value);
		}
		expect(html).toMatch(/<h1[^>]*>Triskel<\/h1>/);
		expect(html).not.toMatch(/<h1[^>]*>[^<]*folk metal/i);
	});

	it("builds a full-width layered hero with an uncropped responsive band photograph", () => {
		const html = renderHome();
		const hero = html.match(/<section[^>]*id="inicio"[\s\S]*?<\/section>/)?.[0] ?? "";
		expect(hero).toContain("<picture");
		expect(hero).toContain('media="(max-width: 700px)"');
		expect(hero).toContain("triskel-promocional-frontal.jpeg");
		expect(hero).toContain("triskel-promocional-sentados.jpeg");
		expect(hero.match(/alt="Los siete integrantes de Triskel en un entorno boscoso"/g)).toHaveLength(1);
		expect(hero).toContain('aria-hidden="true"');
		const css = readStyles("./page.module.css");
		expect(css).toMatch(/\.heroPhoto\s*\{[^}]*object-fit:\s*contain/s);
		expect(css).toContain(".atmosphere");
		expect(css).not.toMatch(/\.poster\s*\{/);
	});

	it("puts a real band action inside the hero, not just in navigation", () => {
		const hero = renderHome().match(/<section[^>]*id="inicio"[\s\S]*?<\/section>/)?.[0] ?? "";
		expect(hero).toMatch(/<a[^>]*href="#banda"[^>]*>Conoce a Triskel/);
	});

	it("provides the requested journey with real unique section targets and headings", () => {
		const html = renderHome();
		for (const id of ["inicio", "biografia", "banda", "musica", "galeria", "dossier", "tienda", "redes"]) {
			expect(html.match(new RegExp(`id="${id}"`, "g"))).toHaveLength(1);
		}
		for (const heading of ["Biografía", "Música", "Galería", "Dossier y contratación", "Tienda", "Sigue a Triskel"]) {
			expect(html).toMatch(new RegExp(`<h2[^>]*>${heading}<\\/h2>`));
		}
		for (const [, target] of html.matchAll(/href="#([^"]+)"/g)) {
			expect(html).toContain(`id="${target}"`);
		}
	});

	it("uses visitor-facing availability without fake playback, contacts or commerce actions", () => {
		const html = renderHome();
		expect(html).toContain("Dossier y contacto, próximamente.");
		expect(html).toContain("En preparación");
		expect(html).not.toContain("Aún no hay material musical disponible");
		expect(html).not.toContain("todavía no están publicados");
		expect(html).not.toContain("todavía no está operativa");
		expect(html).not.toMatch(/<iframe|<audio|<video|mailto:|href="#"|download=/);
		expect(html.match(/href="\/login"/g)).toHaveLength(1);
		expect(html.match(/href="https?:/g)).toHaveLength(16);
	});

	it("presents the owner-confirmed biography as readable paragraphs", () => {
		const html = renderHome().replace(/&#x27;/g, "'");
		const band = html.match(/<section[^>]*id="biografia"[\s\S]*?<\/section>/)?.[0] ?? "";
		for (const fact of ["Cartagena (Murcia)", "Joseph D'Folk", "2022", "Ismael Ros", "Rock Imperium 2026", "siete integrantes"]) expect(band).toContain(fact);
		expect(band.match(/<p[ >]/g)).toHaveLength(2);
	});

	it("presents four official covers with real titles and no invented playback or chronology", () => {
		const music = renderHome().match(/<section[^>]*id="musica"[\s\S]*?<\/section>/)?.[0] ?? "";
		for (const title of ["Inquebrantable", "La Taberna del Triskel", "Resaca en Alta Mar", "Arenas del Tiempo"]) {
			expect(music).toContain(`>${title}</h3>`);
			expect(music).toContain(`alt="Portada de ${title}"`);
		}
		const releases = music.replace(/<article[^>]*aria-labelledby="rock-imperium-title"[\s\S]*?<\/article>/, "");
		expect(releases.match(/<article[ >]/g)).toHaveLength(4);
		expect(releases.match(/<img[ >]/g)).toHaveLength(4);
		expect(releases.match(/<a[ >]/g)).toHaveLength(8);
		expect(releases).not.toMatch(/<audio|<iframe|<video|<button|<time|spotify:|202[0-9]/);
	});

	it("keeps the approved hero wordmark and uses its shadow derivative only in the header",  () => {
		const html = renderHome();
		const hero = html.match(/<section[^>]*id="inicio"[\s\S]*?<\/section>/)?.[0] ?? "";
		expect(hero).toContain("triskel-logotipo-sombra.png");
		expect(hero).not.toContain("triskel-logotipo-web.png");
		for (const tag of ["header", "footer"]) {
			const fragment = html.match(new RegExp(`<${tag}[\\s\\S]*?<\\/${tag}>`))?.[0] ?? "";
			if (tag === "header") {
				expect(fragment).toContain("triskel-logotipo-sombra-header.png");
				expect(fragment).toContain('aria-label="Triskel, inicio"');
				expect(fragment).toContain('href="#inicio"');
			} else {
				expect(fragment).not.toContain("triskel-logotipo-sombra-header.png");
				expect(fragment).not.toContain("<img");
				expect(fragment).not.toContain("Folk metal desde Cartagena (Murcia)");
				expect(fragment).not.toContain("Influencias rock y celtas");
			}
			expect(fragment).not.toContain("triskel-logotipo-sombra.png");
		}
	});

	it("connects lower sections with one background instead of separate color panels", () => {
		const css = readStyles("./page.module.css");
		expect(css).toMatch(/\.journey\s*\{[^}]*background:\s*linear-gradient/s);
		for (const selector of ["band", "professional", "shop"]) {
			const rule = css.match(new RegExp(`\\.${selector}\\s*\\{([^}]+)\\}`))?.[1] ?? "";
			expect(rule).not.toBe("");
			expect(rule).not.toMatch(/background:|border-bottom:/);
		}
	});

	it("presents seven individual portraits after Music, retaining promotional images elsewhere", () => {
		const html = renderHome();
		const gallery = html.match(/<section[^>]*id="galeria"[\s\S]*?<\/section>/)?.[0] ?? "";
		expect(gallery.match(/<figure[ >]/g)).toHaveLength(7);
		expect(gallery).not.toContain("triskel-promocional");
		expect(html.indexOf('id="musica"')).toBeLessThan(html.indexOf('id="galeria"'));
		expect(html.indexOf('id="galeria"')).toBeLessThan(html.indexOf('id="dossier"'));
		expect(html).toContain("triskel-promocional-frontal.jpeg");
		expect(html).toContain("triskel-promocional-sentados.jpeg");
	});

	it("places official profiles after the final content block and before the existing footer", () => {
		const html = renderHome();
		expect(html.indexOf('id="tienda"')).toBeLessThan(html.indexOf('id="redes"'));
		expect(html.indexOf('id="redes"')).toBeLessThan(html.indexOf("<footer"));
		expect(html).toMatch(/href="#redes">Redes y plataformas<\/a>/);
		const header = html.match(/<header[\s\S]*?<\/header>/)?.[0] ?? "";
		expect(header).not.toContain('href="#redes"');
	});

	it("keeps desktop navigation and a native mobile disclosure with an explicit close control", () => {
		const html = renderToStaticMarkup(createElement(PublicHeader));
		expect(html.match(/aria-label="Navegación principal"/g)).toHaveLength(2);
		expect(html).toContain("<details");
		expect(html).toContain("<summary");
		expect(html).toContain("Cerrar menú");
		for (const target of ["biografia", "musica", "galeria", "dossier", "tienda"]) {
			expect(html).toContain(`href="#${target}"`);
		}
		expect(html).not.toContain("/login");
	});

	it("hides closed mobile navigation and preserves visible focus and reduced-motion support", () => {
		const css = readStyles("../components/public/public.module.css");
		expect(css).toMatch(/\.mobileNavigation:not\(\[open\]\)\s*>\s*\.mobileNavLinks\s*\{[^}]*display:\s*none/s);
		expect(css).toMatch(/\.mobileNavigation\[open\]\s*>\s*\.mobileNavLinks\s*\{[^}]*display:\s*grid/s);
		expect(css).toContain(":focus-visible");
		expect(readStyles("./page.module.css")).toContain("prefers-reduced-motion");
	});

	it("allows gallery controls and long headings to reflow with enlarged text", () => {
		const css = readStyles("./page.module.css");
		expect(readStyles("../components/band/gallery.module.css")).toContain("overflow-wrap: anywhere");
		expect(css).toContain("overflow-wrap: anywhere");
	});

	it("preserves the Spanish document and public metadata", () => {
		const html = renderToStaticMarkup(createElement(RootLayout, null, homeMarkup));
		expect(html).toContain('<html lang="es">');
		expect(metadata.description).toContain("banda de folk metal");
		expect(metadata.description).toContain("Cartagena (Murcia)");
	});

	it("preserves the untouched English login and return link", () => {
		const source = readStyles("./login/page.tsx");
		expect(source).toMatch(/<main[^>]*lang="en"/);
		expect(source).toContain('href="/"');
		expect(source).toContain("Customer login");
	});
});
