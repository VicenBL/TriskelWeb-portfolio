import React from "react";
import Link from "next/link";
import styles from "./public.module.css";

const footerSections = [
	{ href: "#biografia", label: "Biografía" },
	{ href: "#musica", label: "Música" },
	{ href: "#galeria", label: "Galería" },
	{ href: "#dossier", label: "Contratación" },
];

export function PublicFooter() {
	return (
		<footer className={styles.footer}>
			<div className={styles.footerNavigation}>
				<nav aria-labelledby="footer-sections-title">
					<h2 className={styles.footerHeading} id="footer-sections-title">Secciones</h2>
					{footerSections.map(({ href, label }) => <a key={href} href={href}>{label}</a>)}
				</nav>
				<nav aria-labelledby="footer-contact-title">
					<h2 className={styles.footerHeading} id="footer-contact-title">Contacto</h2>
					<a href="#redes">Redes y plataformas</a>
					<a href="#dossier">Contratación profesional</a>
					<p className={styles.footerNote}>Formulario profesional, próximamente.</p>
				</nav>
			</div>
			<div className={styles.footerLegal}>
				<p>© {new Date().getFullYear()} Triskel.</p>
				<p>Información legal en preparación.</p>
				<Link className={styles.loginLink} href="/login">Área de cliente</Link>
			</div>
		</footer>
	);
}
