import React from "react";
import Image from "next/image";
import { PreviewForm } from "./PreviewForm";
import styles from "./preview.module.css";

export function ConstructionScreen() {
	return (
		<main className={styles.screen}>
			<section className={styles.content} aria-labelledby="construction-title">
				<Image
					alt="Símbolo de Triskel"
					className={styles.symbol}
					height={1357}
					priority
					sizes="(max-width: 1023px) 200px, 280px"
					src="/brand/triskel-simbolo.png"
					width={1260}
				/>
				<h1 className={styles.title} id="construction-title">
					Estamos preparando nuestra nueva web
				</h1>
				<p className={styles.description}>
					Acceso privado para miembros y colaboradores.
				</p>
				<PreviewForm />
			</section>
		</main>
	);
}
