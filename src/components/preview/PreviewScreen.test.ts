import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ConstructionPage, { metadata } from "../../app/construccion/page";
import { ConstructionScreen } from "./ConstructionScreen";
import { PreviewExit } from "./PreviewExit";

const readSource = (file: string) => readFileSync(new URL(file, import.meta.url), "utf8");

describe("private preview screen", () => {
	it("serves the construction route dynamically with noindex metadata", () => {
		expect(readSource("../../app/construccion/page.tsx")).toContain('export const dynamic = "force-dynamic"');
		expect(metadata.robots).toMatchObject({ index: false, follow: false });
		expect(renderToStaticMarkup(createElement(ConstructionPage))).toContain("Estamos preparando nuestra nueva web");
	});

	it("renders the exact construction copy and only the approved optimized symbol", () => {
		const html = renderToStaticMarkup(createElement(ConstructionScreen));
		expect(html).toContain("Estamos preparando nuestra nueva web");
		expect(html).toContain("Acceso privado para miembros y colaboradores.");
		expect(html).toContain('src="/_next/image?');
		expect(html).toContain("%2Fbrand%2Ftriskel-simbolo.png");
		expect(html).not.toMatch(/triskel-(?:logotipo|promocional)/);
		expect(html.indexOf("triskel-simbolo.png")).toBeLessThan(html.indexOf("Estamos preparando nuestra nueva web"));
	});

	it("exposes a labeled password control and an associated generic accessible error", () => {
		const html = renderToStaticMarkup(createElement(ConstructionScreen));
		expect(html).toMatch(/<label[^>]*for="[^"]+"[^>]*>[\s\S]*?Contraseña[\s\S]*?<\/label>/);
		expect(html).toMatch(/<input(?=[^>]*type="password")(?=[^>]*autoComplete="current-password")(?=[^>]*required="")(?=[^>]*maxLength="1024")[^>]*>/);
		expect(html).toMatch(/aria-describedby="[^"]+"/);
		expect(html).toContain('role="alert"');
		expect(html).toContain('role="status"');
		const clientSource = readSource("./PreviewForm.tsx");
		expect(clientSource).toContain('fetch("/api/preview/session"');
		expect(clientSource).toContain('credentials: "same-origin"');
		expect(clientSource).toContain('window.location.replace("/")');
		expect(clientSource).not.toMatch(/localStorage|sessionStorage|console\.|NEXT_PUBLIC_/);
	});

	it("renders the separate discreet exit control without changing the host navigation", () => {
		const html = renderToStaticMarkup(createElement(PreviewExit));
		expect(html).toContain("Cerrar acceso privado");
		expect(html).toContain('type="button"');
		const clientSource = readSource("./PreviewExit.tsx");
		expect(clientSource).toContain('method: "DELETE"');
		expect(clientSource).toContain('window.location.replace("/construccion")');
		expect(clientSource).toContain('credentials: "same-origin"');
		expect(clientSource).not.toContain("firebase");
	});

	it("keeps the composition responsive, focused, high-contrast, and still without motion by default", () => {
		const css = readSource("./preview.module.css");
		for (const declaration of ["min-height: 100svh", "#120c08", "#fbe5b2", "#cc9a55", "overflow-wrap: anywhere", ":focus-visible", "min-height: 44px", "position: fixed"]) {
			expect(css).toContain(declaration);
		}
		expect(css).toContain("max-width: 20rem");
		expect(css).not.toMatch(/animation:|transition:/);
	});
});
