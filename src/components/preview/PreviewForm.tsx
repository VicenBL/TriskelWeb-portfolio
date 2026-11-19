"use client";

import React, { useId, useRef, useState, type FormEvent } from "react";
import styles from "./preview.module.css";

const genericError = "No se ha podido validar el acceso. Comprueba la contraseña e inténtalo de nuevo.";

export function PreviewForm() {
	const inputId = useId();
	const errorId = useId();
	const statusId = useId();
	const formRef = useRef<HTMLFormElement>(null);
	const [pending, setPending] = useState(false);
	const [hasError, setHasError] = useState(false);

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (pending) return;

		const form = event.currentTarget;
		const password = String(new FormData(form).get("password") ?? "");
		setPending(true);
		setHasError(false);

		try {
			const response = await fetch("/api/preview/session", {
				method: "POST",
				credentials: "same-origin",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ password }),
			});

			if (response.status === 204) {
				window.location.replace("/");
				return;
			}

			setHasError(true);
		} catch {
			setHasError(true);
		} finally {
			formRef.current?.reset();
			setPending(false);
		}
	}

	return (
		<form className={styles.form} onSubmit={handleSubmit} ref={formRef}>
			<label className={styles.label} htmlFor={inputId}>Contraseña</label>
			<input
				autoComplete="current-password"
				className={styles.password}
				disabled={pending}
				id={inputId}
				maxLength={1024}
				name="password"
				aria-describedby={`${errorId} ${statusId}`}
				aria-invalid={hasError || undefined}
				required
				type="password"
			/>
			<button className={styles.submit} disabled={pending} type="submit">
				{pending ? "Comprobando acceso…" : "Acceder"}
			</button>
			<p className={styles.status} id={statusId} role="status">
				{pending ? "Validando acceso…" : ""}
			</p>
			<p className={styles.error} id={errorId} role="alert" aria-live="assertive">
				{hasError ? genericError : ""}
			</p>
		</form>
	);
}
