import React from "react";
import Link from "next/link";
import Image from "../preview/PrivateImage";
import { MobileNavigation } from "./MobileNavigation";
import { publicNavigation } from "./navigation";
import styles from "./public.module.css";

export function PublicHeader() {
	return (
		<header className={styles.header}>
			<a className={styles.skipLink} href="#contenido">Saltar al contenido</a>
			<Link className={styles.homeLink} href="#inicio" aria-label="Triskel, inicio">
				<Image src="/brand/triskel-logotipo-sombra-header.png" alt="" width={600} height={216} sizes="(max-width: 1023px) 120px, 150px" />
			</Link>
			<nav aria-label="Navegación principal" className={styles.desktopNav}>
				{publicNavigation.map(({ href, label }) => <a key={href} href={href}>{label}</a>)}
			</nav>
			<MobileNavigation />
		</header>
	);
}
