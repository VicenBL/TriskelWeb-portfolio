"use client";

import React, { useId, useState } from "react";
import styles from "./preview.module.css";

const genericError = "No se ha podido cerrar el acceso privado. Inténtalo de nuevo.";

export function PreviewExit() {
	const errorId = useId();
	const [pending, setPending] = useState(false);
	const [hasError, setHasError] = useState(false);

	async function handleExit() {
		if (pending) return;
		setPending(true);
		setHasError(false);

		try {
			const response = await fetch("/api/preview/session", {
				method: "DELETE",
				credentials: "same-origin",
			});
			if (response.status === 204) {
				window.location.replace("/construccion");
				return;
			}
			setHasError(true);
		} catch {
			setHasError(true);
		} finally {
			setPending(false);
		}
	}

	return (
		<div className={styles.exit}>
			<button
				aria-describedby={hasError ? errorId : undefined}
				className={styles.exitButton}
				disabled={pending}
				onClick={handleExit}
				type="button"
			>
				{pending ? "Cerrando acceso…" : "Cerrar acceso privado"}
			</button>
			{hasError ? <p className={styles.exitError} id={errorId} role="alert">{genericError}</p> : null}
		</div>
	);
}
