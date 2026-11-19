import React from "react";
import styles from "./social.module.css";
import { socialProfiles, type SocialPlatform } from "./profiles";

type IconProps = { platform: SocialPlatform };

function PlatformIcon({ platform }: IconProps) {
	switch (platform) {
		case "Spotify":
			return <><circle cx="12" cy="12" r="10" fill="currentColor" /><path d="M6.2 9.1c3.8-1.1 8.1-.6 11.4 1.3M7 12.2c3.1-.9 6.7-.4 9.4 1.2m-8.6 1.8c2.5-.7 5.3-.3 7.5 1" fill="none" stroke="#22120a" strokeLinecap="round" strokeWidth="1.5" /></>;
		case "Instagram":
			return <><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="17.5" cy="6.8" r="1.2" fill="currentColor" /></>;
		case "YouTube":
			return <><rect x="2" y="5" width="20" height="14" rx="4" fill="currentColor" /><path d="m10 9 5 3-5 3z" fill="#22120a" /></>;
		case "TikTok":
			return <path d="M14 3h3c.2 2.2 1.5 3.6 4 4v3c-1.7 0-3.1-.5-4-1.2v6.1a6 6 0 1 1-6-6h1v3.2h-1a2.8 2.8 0 1 0 2.8 2.8z" fill="currentColor" />;
		case "Apple Music":
			return <path d="M18.7 3.2v13.1a3.1 3.1 0 1 1-1.8-2.8V7.1l-7 1.5v9.3a3.1 3.1 0 1 1-1.8-2.8V7.1z" fill="currentColor" />;
		case "Facebook":
			return <path d="M13.5 21v-8h2.7l.4-3.1h-3.1v-2c0-.9.3-1.5 1.6-1.5h1.7V3.6c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.1H7.3V13h2.8v8z" fill="currentColor" />;
		case "SoundCloud":
			return <><path d="M3 13v5m3-8v8m3-11v11" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" /><path d="M12 18V8.2a5.2 5.2 0 0 1 9.2 3.8A3 3 0 0 1 21 18Z" fill="currentColor" /></>;
	}
}

export function SocialProfiles() {
	return (
		<section aria-labelledby="social-profiles-title" className={styles.section} id="redes">
			<div className={styles.content}>
				<h2 id="social-profiles-title">Sigue a Triskel</h2>
				<p className={styles.subtitle}>Música, vídeos y novedades.</p>
				<ul className={styles.profiles}>
					{socialProfiles.map(({ name, href }) => (
						<li key={name}>
							<a aria-label={name} href={href} rel="noopener noreferrer" target="_blank">
								<svg aria-hidden="true" className={styles.icon} viewBox="0 0 24 24"><PlatformIcon platform={name} /></svg>
								<span>{name}</span>
							</a>
						</li>
					))}
				</ul>
			</div>
		</section>
	);
}
