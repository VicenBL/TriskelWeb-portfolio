import Image from "../preview/PrivateImage";
import React from "react";
import { releases, type MusicRelease } from "./releases";
import styles from "./music.module.css";

const coverSizes = "(max-width: 767px) 44vw, (max-width: 1023px) 43vw, (max-width: 1440px) 22vw, 302px";

function SpotifyIcon() {
	return <svg aria-hidden="true" focusable="false" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0a12 12 0 1 0 0 24 12 12 0 0 0 0-24Zm5.5 17.3a.75.75 0 0 1-1.03.25c-2.83-1.73-6.4-2.12-10.6-1.16a.75.75 0 0 1-.34-1.46c4.6-1.06 8.55-.61 11.72 1.34a.75.75 0 0 1 .25 1.03Zm1.47-3.27a.94.94 0 0 1-1.29.31c-3.24-1.99-8.18-2.56-12.01-1.4a.94.94 0 0 1-.54-1.8c4.37-1.32 9.82-.67 13.53 1.6a.94.94 0 0 1 .31 1.29Zm.13-3.4C15.22 8.32 8.82 8.1 5.11 9.22a1.13 1.13 0 0 1-.65-2.16c4.26-1.29 11.33-1.04 15.8 1.61a1.13 1.13 0 1 1-1.16 1.95Z" /></svg>;
}

function YouTubeIcon() {
	return <svg aria-hidden="true" focusable="false" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31.2 31.2 0 0 0 0 12a31.2 31.2 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31.2 31.2 0 0 0 24 12a31.2 31.2 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z" /></svg>;
}

export function ReleaseFeature({ release }: { release: MusicRelease }) {
	const titleId = `release-${release.id}`;
	return (
		<article className={styles.release} aria-labelledby={titleId}>
			<h3 className={styles.visuallyHidden} id={titleId}>{release.title}</h3>
			<div className={styles.artwork}>
				<Image className={styles.cover} alt={`Portada de ${release.title}`} src={release.cover.src} width={release.cover.width} height={release.cover.height} sizes={coverSizes} loading="lazy" />
			</div>
			{(release.spotifyUrl || release.youtubeUrl) && (
				<div className={styles.actions}>
					{release.spotifyUrl && <a href={release.spotifyUrl} aria-label={`Escuchar ${release.title} en Spotify`}><SpotifyIcon /><span>Spotify</span></a>}
					{release.youtubeUrl && <a href={release.youtubeUrl} aria-label={`Ver ${release.title} en YouTube`}><YouTubeIcon /><span>YouTube</span></a>}
				</div>
			)}
		</article>
	);
}

export function MusicSection() {
	return (
		<section className={styles.music} id="musica" aria-labelledby="music-title" tabIndex={-1}>
			<div className={styles.inner}>
				<h2 className={styles.heading} id="music-title">Música</h2>
				<div className={styles.releases}>
					{releases.map(release => <ReleaseFeature key={release.id} release={release} />)}
				</div>
				<article className={styles.specialVideo} aria-labelledby="rock-imperium-title">
					<div className={styles.specialArtwork}>
						<Image
							className={styles.specialImage}
							alt="Escenario de Rock Imperium 2026 con el logotipo de Triskel"
							src="/images/media/wakthrough-portada.jpg.avif"
							width={900}
							height={506}
							sizes="(max-width: 767px) 100vw, (max-width: 1023px) 42vw, 450px"
							loading="lazy"
						/>
					</div>
					<div className={styles.specialCopy}>
						<p className={styles.specialLabel}>VÍDEO ESPECIAL</p>
						<h3 className={styles.specialTitle} id="rock-imperium-title">Así vivimos Rock Imperium 2026</h3>
						<p className={styles.specialDescription}>Nuestro paso por Rock Imperium Festival 2026, en Cartagena.</p>
						<a className={styles.specialLink} href="https://www.youtube.com/watch?v=nOQrMXlUXGY" target="_blank" rel="noopener noreferrer" aria-label="Ver en YouTube: Así vivimos Rock Imperium 2026 (se abre en otra pestaña)">
							<svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M9 5v14l11-7z" /></svg>
							<span>Ver en YouTube</span>
						</a>
					</div>
				</article>
			</div>
		</section>
	);
}
