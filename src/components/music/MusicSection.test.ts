import { existsSync, readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

const expected = [
	["Inquebrantable", "INQUEBRANTABLE_portada.jpg", "https://open.spotify.com/album/2iGznw5oRPJmHmtGV7SzPC", "https://www.youtube.com/watch?v=j05EQAvMqNM"],
	["La Taberna del Triskel", "TABERNA-portada-baja.jpg", "https://open.spotify.com/album/6qLIqFmQLRSxHFilCXb0Pc", "https://www.youtube.com/watch?v=7Rd9SnLs3h8"],
	["Resaca en Alta Mar", "RESACA-portada.jpg", "https://open.spotify.com/album/7F8kSSBsrWMVD3LUwJpxxk", "https://www.youtube.com/watch?v=Dcy0iDUMlLg"],
	["Arenas del Tiempo", "ARENAS-portada-alta.jpg", "https://open.spotify.com/album/0YbcMapiTAPAuF2drYtuAy", "https://www.youtube.com/watch?v=KQ8ah1VO6ig"],
];

describe("music releases", () => {
	it("publishes exactly the eight owner-provided destinations under the correct release", async () => {
		const { releases } = await import("./releases");
		const { ReleaseFeature } = await import("./MusicSection");
		expect(releases).toHaveLength(4);
		for (const [index, release] of releases.entries()) {
			const row = expected[index];
			expect(release.title).toBe(row[0]);
			expect(release.cover.src).toBe(`/images/musica/${row[1]}`);
			expect(existsSync(`public${release.cover.src}`)).toBe(true);
			expect(release.spotifyUrl).toBe(row[2]);
			expect(release.youtubeUrl).toBe(row[3]);
			expect(Object.keys(release).sort()).toEqual(["cover", "id", "spotifyUrl", "title", "youtubeUrl"]);
			const html = renderToStaticMarkup(createElement(ReleaseFeature, { release }));
			expect(html.match(/<a[ >]/g)).toHaveLength(2);
			expect(html).toContain(`href="${row[2]}"`);
			expect(html).toContain(`href="${row[3]}"`);
			expect(html).toContain(`aria-label="Escuchar ${release.title} en Spotify"`);
			expect(html).toContain(`aria-label="Ver ${release.title} en YouTube"`);
		}
	});

	it("preserves optional-link support without rendering inactive controls", async () => {
		const { ReleaseFeature } = await import("./MusicSection");
		const { releases } = await import("./releases");
		const html = renderToStaticMarkup(createElement(ReleaseFeature, { release: { ...releases[0], spotifyUrl: undefined, youtubeUrl: undefined } }));
		expect(html).toContain(">Inquebrantable</h3>");
		expect(html).not.toMatch(/<a[ >]|<button|<iframe|<audio|próximamente|disabled/i);
	});

	it.each(["Spotify", "YouTube"])("supports %s independently with an accessible ordinary HTTPS link", async platform => {
		const { ReleaseFeature } = await import("./MusicSection");
		const { releases } = await import("./releases");
		const release = { ...releases[0],
			spotifyUrl: platform === "Spotify" ? "https://spotify.test/official" as const : undefined,
			youtubeUrl: platform === "YouTube" ? "https://youtube.test/official" as const : undefined,
		};
		const html = renderToStaticMarkup(createElement(ReleaseFeature, { release }));
		expect(html.match(/<a[ >]/g)).toHaveLength(1);
		expect(html).toContain(`href="https://${platform.toLowerCase()}.test/official"`);
		expect(html).toContain(`aria-label="${platform === "Spotify" ? "Escuchar" : "Ver"} Inquebrantable en ${platform}"`);
		expect(html).toContain(`>${platform}</span>`);
		expect(html).toContain('aria-hidden="true"');
		expect(html).not.toMatch(/target=|spotify:\/\/|<iframe|<audio/);
	});

	it("escapes query parameters without changing destinations or embedding players", async () => {
		const { ReleaseFeature } = await import("./MusicSection");
		const { releases } = await import("./releases");
		const html = renderToStaticMarkup(createElement(ReleaseFeature, {
			release: { ...releases[1], youtubeUrl: "https://youtube.test/watch?v=official&feature=share" },
		}));
		expect(html.match(/<a[ >]/g)).toHaveLength(2);
		expect(html).toContain('href="https://youtube.test/watch?v=official&amp;feature=share"');
		expect(html).not.toMatch(/<iframe|<audio|<video|autoplay|target=|spotify:\/\//);
	});

	it("loads just one complete optimized cover per release, lazily, with reader-accessible names", async () => {
		const { ReleaseFeature } = await import("./MusicSection");
		const { releases } = await import("./releases");
		for (const release of releases) {
			const html = renderToStaticMarkup(createElement(ReleaseFeature, { release }));
			const images = html.match(/<img[^>]+>/g) ?? [];
			expect(images).toHaveLength(1);
			expect(images[0]).toContain(`alt="Portada de ${release.title}"`);
			expect(images[0]).toContain('loading="lazy"');
			expect(images[0]).toContain(`src="${release.cover.src}?w=`);
			expect(images[0]).not.toContain("/_next/image?");
			expect(html).toContain(`aria-labelledby="release-${release.id}"`);
			expect(html).toContain(`id="release-${release.id}"`);
			expect(html).not.toMatch(/<a[^>]*>\s*<img/);
		}
	});

	it("uses a two-column base, four-column desktop gallery, a diagonal entry and fine-pointer-only blur", () => {
		const css = readFileSync(new URL("./music.module.css", import.meta.url), "utf8");
		expect(css).toMatch(/\.releases\s*\{[^}]*grid-template-columns:\s*repeat\(2,/s);
		expect(css).toContain("repeat(4, minmax(0, 1fr))");
		expect(css).toContain("clip-path: polygon(");
		expect(css).toMatch(/\.artwork\s*\{[^}]*aspect-ratio:\s*1/s);
		expect(css).toMatch(/\.cover\s*\{[^}]*object-fit:\s*contain/s);
		expect(css).toContain("@media (min-width: 1024px) and (hover: hover) and (pointer: fine)");
		expect(css).toContain(".release:hover .cover");
		expect(css).toContain(".release:focus-within .actions");
		expect(css).toContain("prefers-reduced-motion: no-preference");
		expect(css).toContain("min-height: 44px");
		expect(css).toContain("min-width: 44px");
		expect(css).toContain(":focus-visible");
		expect(css).not.toMatch(/transform:|backdrop-filter:|animation:|border-radius:/);
	});

	it("adds the special Rock Imperium video after, not among, the four unchanged releases", async () => {
		const { MusicSection } = await import("./MusicSection");
		const html = renderToStaticMarkup(createElement(MusicSection));
		const lastReleaseTitle = html.indexOf(">Arenas del Tiempo</h3>");
		const videoIndex = html.indexOf("VÍDEO ESPECIAL");
		expect(html).toContain(">Música</h2>");
		expect(html.match(/aria-labelledby="release-/g) ?? []).toHaveLength(4);
		expect(html.match(/aria-label="(?:Escuchar|Ver) .+? en (?:Spotify|YouTube)"/g) ?? []).toHaveLength(8);
		expect(videoIndex).toBeGreaterThan(lastReleaseTitle);
		expect(html).toContain("Así vivimos Rock Imperium 2026");
		expect(html).toContain("Nuestro paso por Rock Imperium Festival 2026, en Cartagena.");
		expect(html).toContain('href="https://www.youtube.com/watch?v=nOQrMXlUXGY"');
		expect(html).toContain(">Ver en YouTube</span></a>");
		expect(html).toContain('target="_blank"');
		expect(html).toContain('rel="noopener noreferrer"');
		expect(html).toContain('alt="Escenario de Rock Imperium 2026 con el logotipo de Triskel"');
		expect(html).toContain('aria-label="Ver en YouTube: Así vivimos Rock Imperium 2026 (se abre en otra pestaña)"');
		expect(html).toContain("/images/media/wakthrough-portada.jpg.avif?w=");
		expect(html).toContain('width="900"');
		expect(html).toContain('height="506"');
		expect(html).toContain('loading="lazy"');
		expect(html).toContain('sizes="(max-width: 767px) 100vw, (max-width: 1023px) 42vw, 450px"');
		expect(html).not.toMatch(/<iframe|<video|autoplay|<audio|single|álbum|grabación íntegra/i);
	});

	it("styles the video as a compact responsive editorial block with accessible visible action", () => {
		const css = readFileSync(new URL("./music.module.css", import.meta.url), "utf8");
		expect(css).toMatch(/\.specialVideo\s*\{[^}]*display:\s*grid/s);
		expect(css).toContain("grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr)");
		expect(css).toMatch(/@media\s*\(max-width:\s*767px\)[\s\S]*?\.specialVideo\s*\{[^}]*grid-template-columns:\s*1fr/s);
		expect(css).toContain("min-height: 44px");
		expect(css).toContain(":focus-visible");
		expect(css).toContain("prefers-reduced-motion");
	});

	it("keeps interaction server-rendered and the title visually hidden rather than removed", () => {
		const source = readFileSync(new URL("./MusicSection.tsx", import.meta.url), "utf8");
		expect(source).not.toMatch(/use client|useEffect|useState|onMouse|onTouch|<iframe|<audio/);
		expect(source).toContain("className={styles.visuallyHidden}");
		expect(source).not.toContain("styles.atmosphere");
	});
});
