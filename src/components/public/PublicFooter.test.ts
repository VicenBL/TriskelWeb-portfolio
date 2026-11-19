import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PublicFooter } from "./PublicFooter";

const renderFooter = () => renderToStaticMarkup(createElement(PublicFooter));

describe("public footer", () => {
	it("groups the four real section destinations under Secciones", () => {
		const html = renderFooter();
		const nav = html.match(/<nav[^>]*aria-labelledby="footer-sections-title"[\s\S]*?<\/nav>/)?.[0] ?? "";
		expect(nav).toContain(">Secciones</h2>");
		expect([...nav.matchAll(/href="([^"]+)"[^>]*>([^<]+)<\/a>/g)].map(([, href, label]) => [href, label])).toEqual([
			["#biografia", "Biografía"], ["#musica", "Música"], ["#galeria", "Galería"], ["#dossier", "Contratación"],
		]);
	});
	it("uses existing music and informational contracting without pretending to offer profiles or a form", () => {
		const html = renderFooter();
		expect(html).toContain(">Contacto</h2>");
		expect(html).toContain('href="#redes">Redes y plataformas</a>');
		expect(html).toContain('href="#dossier">Contratación profesional</a>');
		expect(html).toContain("Formulario profesional, próximamente.");
		expect(html).not.toMatch(/Explora|Conecta|mailto:|<form|href="\/(enlaces|contacto)"/);
	});
	it("centers two widely spaced, left-aligned navigation columns in a moderate footer container", () => {
		const html = renderFooter();
		expect(html).toMatch(/<div class="[^"]*footerNavigation[^"]*">[\s\S]*<nav aria-labelledby="footer-sections-title"[\s\S]*<nav aria-labelledby="footer-contact-title"[\s\S]*<\/div>/);
		const css = readFileSync(new URL("./public.module.css", import.meta.url), "utf8");
		expect(css).toMatch(/\.footerNavigation\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s);
		expect(css).toMatch(/\.footerNavigation\s*\{[^}]*margin-inline:\s*auto/s);
		expect(css).toMatch(/\.footerNavigation\s*\{[^}]*max-width:\s*60rem/s);
		expect(css).toMatch(/\.footerNavigation\s*\{[^}]*gap:\s*8rem/s);
		expect(css).toMatch(/\.footer nav\s*\{[^}]*display:\s*grid/s);
		expect(css).toMatch(/@media \(max-width:\s*480px\)[\s\S]*\.footerNavigation[^}]*grid-template-columns:\s*1fr/);
	});
	it("uses a one-pixel muted-gold gradient separator aligned to the content", () => {
		const css = readFileSync(new URL("./public.module.css", import.meta.url), "utf8");
		expect(css).toMatch(/\.footer::before\s*\{[^}]*height:\s*1px/s);
		expect(css).toMatch(/\.footer::before\s*\{[^}]*linear-gradient\(90deg,\s*transparent,\s*rgb\(204 154 85 \/ 42%\) 50%,\s*transparent\)/s);
		expect(css).toMatch(/\.footer::before\s*\{[^}]*max-width:\s*60rem/s);
		expect(css).toMatch(/\.footer::before\s*\{[^}]*margin-inline:\s*auto/s);
		expect(css).toMatch(/\.footer\s*\{[^}]*border-top:\s*0/s);
	});
	it("removes only footer branding while preserving legal text, navigation, and client access", () => {
		const html = renderFooter();
		expect(html).not.toContain("triskel-logotipo-sombra-header.png");
		expect(html).not.toContain("Folk metal desde Cartagena (Murcia)");
		expect(html).not.toContain("Influencias rock y celtas");
		expect(html).toContain('href="/login"');
		expect(html).toContain(String(new Date().getFullYear()));
		expect(html).toContain("Información legal en preparación.");
		expect(html).not.toMatch(/href="\/(aviso-legal|privacidad|cookies)"/);
	});
});
