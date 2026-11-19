import Image from "../preview/PrivateImage";
import React, { type CSSProperties } from "react";
import { bandMembers } from "./members";
import { PortraitViewer } from "./PortraitViewer";
import styles from "./gallery.module.css";

export function BandGallery() {
	return (
		<section className={styles.gallery} id="galeria" aria-labelledby="gallery-title" tabIndex={-1}>
			<h2 id="gallery-title">Galería</h2>
			<PortraitViewer>
				<div className={styles.mosaic}>
					{bandMembers.map((member, index) => (
						<figure className={styles.portrait} key={member.id} style={{
							"--portrait-position": member.position,
							"--portrait-mobile-position": member.mobilePosition,
							"--portrait-mobile-scale": member.mobileScale,
						} as CSSProperties}>
							<a aria-haspopup="dialog" aria-label={`Ampliar retrato de ${member.name}, ${member.role.toLowerCase()}`} data-portrait-index={index} href={member.photo}>
								<Image alt={member.alt} src={member.photo} width={member.width} height={member.height} loading="lazy"
									sizes={index === 6 ? "(max-width: 700px) 90vw, (max-width: 1440px) 22vw, 311px" : "(max-width: 700px) 44vw, (max-width: 1440px) 22vw, 311px"} />
								<svg className={styles.expand} aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="10" cy="10" r="6" /><path d="m15 15 5 5M7 10h6m-3-3v6" /></svg>
							</a>
							<figcaption className={styles.caption}><span className={styles.name}>{member.name}</span><span className={styles.role}>{member.role}</span></figcaption>
						</figure>
					))}
				</div>
			</PortraitViewer>
		</section>
	);
}
