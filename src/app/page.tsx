import Image from "../components/preview/PrivateImage";
import { getImageProps } from "../components/preview/image-props";
import React from "react";
import { MusicSection } from "../components/music/MusicSection";
import { BandGallery } from "../components/band/BandGallery";
import { SocialProfiles } from "../components/social/SocialProfiles";
import { PublicFooter } from "../components/public/PublicFooter";
import { PublicHeader } from "../components/public/PublicHeader";
import styles from "./page.module.css";
import { requirePreviewPage } from "../services/preview-page-guard";
import { PreviewExit } from "../components/preview/PreviewExit";

export const dynamic = "force-dynamic";

const frontal = "/images/banda/triskel-promocional-frontal.jpeg";
const seated = "/images/banda/triskel-promocional-sentados.jpeg";
const bandAlt = "Los siete integrantes de Triskel en un entorno boscoso";

export default async function Home() {
	const previewAccess = await requirePreviewPage();
	const mobilePhoto = getImageProps({ alt: bandAlt, height: 1280, sizes: "100vw", src: frontal, width: 1081 }).props;
	const mobileAtmosphere = getImageProps({ alt: "", height: 1280, sizes: "100vw", src: frontal, width: 1081 }).props;
	const secondaryPhoto = getImageProps({ alt: bandAlt, height: 1229, sizes: "100vw", src: seated, width: 1280 }).props;

	return (
		<div className={styles.site}>
			<PublicHeader />
			<main id="contenido" tabIndex={-1}>
				<section className={styles.hero} id="inicio" aria-labelledby="home-title" tabIndex={-1}>
					<h1 className={styles.visuallyHidden} id="home-title">Triskel</h1>
					<picture className={styles.atmosphere}>
						<source media="(max-width: 700px)" sizes={mobileAtmosphere.sizes} srcSet={mobileAtmosphere.srcSet} />
						<Image alt="" src={seated} width={1280} height={1229} sizes="100vw" loading="eager" />
					</picture>
					<div className={styles.scene}>
						<picture>
							<source media="(max-width: 700px)" sizes={mobilePhoto.sizes} srcSet={mobilePhoto.srcSet} />
							<Image alt={bandAlt} className={styles.heroPhoto} fetchPriority="high" height={1229} loading="eager" sizes="(max-width: 1280px) 100vw, 1280px" src={seated} width={1280} />
						</picture>
					</div>
					<Image alt="" aria-hidden="true" className={styles.wordmark} height={1714} loading="eager" sizes="(max-width: 700px) 93vw, (max-width: 1440px) 50vw, 717px" src="/brand/triskel-logotipo-sombra.png" width={4096} />
					<div className={styles.heroContent}>
						<p>Folk metal con influencias rock y celtas</p>
						<a className={styles.bandAction} href="#banda">Conoce a Triskel <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 4v16m-6-6 6 6 6-6" /></svg></a>
					</div>
				</section>

				<div className={styles.journey}>
					<span id="banda" className={styles.legacyAnchor} aria-hidden="true" />
					<section className={styles.band} id="biografia" aria-labelledby="band-title" tabIndex={-1}>
						<div className={styles.bandIntroduction}>
							<h2 id="band-title">Biografía</h2>
							<p>Triskel nace en Cartagena (Murcia) de la mano del flautista Joseph D&apos;Folk. En 2022, el proyecto comienza a profesionalizarse y a desarrollar su propio repertorio junto al guitarrista y compositor Ismael Ros.</p>
							<p>Tras presentar singles como Inquebrantable, La Taberna del Triskel y Resaca en Alta Mar, y actuar en Rock Imperium 2026, la banda completa su formación de siete integrantes, consolidando su propuesta de folk metal con influencias rock y celtas.</p>
						</div>
						<picture className={styles.bandPicture}>
							<source media="(max-width: 700px)" sizes={secondaryPhoto.sizes} srcSet={secondaryPhoto.srcSet} />
							<Image className={styles.bandPhoto} src={frontal} alt={bandAlt} width={1081} height={1280} sizes="(max-width: 700px) 100vw, 40vw" />
						</picture>
					</section>

					<MusicSection />

					<BandGallery />

					<section className={styles.professional} id="dossier" aria-labelledby="dossier-title" tabIndex={-1}>
						<h2 id="dossier-title">Dossier y contratación</h2>
						<div><p>Programación, prensa y contratación.</p><p className={styles.availability}>Dossier y contacto, próximamente.</p></div>
					</section>
					<section className={styles.shop} id="tienda" aria-labelledby="shop-title" tabIndex={-1}>
						<h2 id="shop-title">Tienda</h2>
						<p>En preparación</p>
					</section>
					<SocialProfiles />
				</div>
			</main>
			<PublicFooter />
			{previewAccess && <PreviewExit />}
		</div>
	);
}
