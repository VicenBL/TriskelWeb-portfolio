"use client";

import React, { useRef } from "react";
import { publicNavigation } from "./navigation";
import styles from "./public.module.css";

export function MobileNavigation() {
	const disclosure = useRef<HTMLDetailsElement>(null);
	const toggle = useRef<HTMLElement>(null);

	function closeMenu() {
		if (disclosure.current) disclosure.current.open = false;
		toggle.current?.focus();
	}

	return (
		<details
			className={styles.mobileNavigation}
			ref={disclosure}
			onKeyDown={(event) => {
				if (event.key === "Escape") {
					event.preventDefault();
					closeMenu();
				}
			}}
		>
			<summary className={styles.menuToggle} ref={toggle}>
				Menú
				<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
					<path d="M3 7h18M3 12h18M3 17h18" />
				</svg>
			</summary>
			<nav aria-label="Navegación principal" className={styles.mobileNavLinks}>
				{publicNavigation.map(({ href, label }) => (
					<a key={href} href={href} onClick={() => {
						if (disclosure.current) disclosure.current.open = false;
						document.querySelector<HTMLElement>(href)?.focus({ preventScroll: true });
					}}>{label}</a>
				))}
				<button className={styles.closeMenu} onClick={closeMenu} type="button">Cerrar menú</button>
			</nav>
		</details>
	);
}
