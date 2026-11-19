import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { socialProfiles } from "./profiles";
import { SocialProfiles } from "./SocialProfiles";

const expectedProfiles = [
	["Spotify", "https://open.spotify.com/artist/6JBTLlRtcch06CANcHJkbm"],
	["Instagram", "https://www.instagram.com/triskelfolk/"],
	["YouTube", "https://www.youtube.com/@triskelfolkmetal"],
	["TikTok", "https://www.tiktok.com/@triskelfolk"],
	["Apple Music", "https://music.apple.com/es/artist/triskel/689227916"],
	["Facebook", "https://www.facebook.com/people/Triskel/61567356530778/"],
	["SoundCloud", "https://soundcloud.com/triskel-808082361"],
];

const renderProfiles = () => renderToStaticMarkup(createElement(SocialProfiles));
const readStyles = () => readFileSync(new URL("./social.module.css", import.meta.url), "utf8");

describe("SocialProfiles", () => {
	it("balances seven profiles as one desktop row and grouped tablet/mobile rows", () => {
		const css = readStyles();
		expect(css).toMatch(/\.profiles\s*\{[^}]*grid-template-columns: repeat\(12,/s);
		expect(css).toMatch(/\.profiles li:nth-child\(n\+5\)\s*\{[^}]*grid-column: span 4/s);
		expect(css).toMatch(/@media \(min-width: 1200px\)[\s\S]*grid-template-columns: repeat\(7,/);
		expect(css).toMatch(/@media \(max-width: 700px\)[\s\S]*grid-template-columns: repeat\(6,[\s\S]*nth-child\(n\+5\)[^}]*grid-column: span 2/);
	});

	it("renders the SoundCloud waveform as visible strokes beside its cloud", () => {
		const link = renderProfiles().match(/<a[^>]*aria-label="SoundCloud"[\s\S]*?<\/a>/)?.[0] ?? "";
		expect(link).toMatch(/<path[^>]*stroke="currentColor"[^>]*stroke-linecap="round"/);
	});

	it("centralizes all seven owner-provided destinations in editorial order", () => {
		expect(socialProfiles.map(({ name, href }) => [name, href])).toEqual(expectedProfiles);
	});

	it("centres its title and subtitle while inheriting the shared H2 scale", () => {
		const css = readStyles();
		expect(css).toMatch(/\.section \.content h2\s*\{[^}]*text-align:\s*center/s);
		expect(css).not.toMatch(/\.section \.content h2\s*\{[^}]*font-size:/s);
		expect(css).toMatch(/\.section \.subtitle\s*\{[^}]*text-align:\s*center/s);
	});

	it("server-renders the named section and accessible external links in the same order", () => {
		const html = renderProfiles();
		expect(html).toContain('id="redes"');
		expect(html).toContain(">Sigue a Triskel</h2>");
		expect(html).toContain("Música, vídeos y novedades.");
		const links = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)];
		expect(links.map(([, attributes]) => {
			const label = attributes.match(/aria-label="([^"]+)"/)?.[1];
			return [label, attributes.match(/href="([^"]+)"/)?.[1]];
		})).toEqual(expectedProfiles);
		for (const [attributes, body] of links.map(([, attributes, body]) => [attributes, body] as const)) {
			expect(attributes).toContain('target="_blank"');
			expect(attributes).toContain('rel="noopener noreferrer"');
			expect(body).toMatch(/<svg[^>]*aria-hidden="true"/);
		}
		expect(html).not.toMatch(/<iframe|<script|<img|spotify\.com\/embed/);
	});
});
