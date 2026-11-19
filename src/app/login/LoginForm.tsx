"use client";

import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { useState } from "react";
import {
	AuthSessionClientError,
	clearAppSession,
	createAppSessionFromFirebaseIdToken,
	type AuthenticatedAccount,
} from "../../services/auth-session-client";
import {
	FirebaseClientConfigurationError,
	getFirebaseClientAuth,
} from "../../services/firebase-client";
import styles from "./login.module.css";

type FormState = "idle" | "loading" | "authenticated" | "error";

export function LoginForm() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [status, setStatus] = useState<FormState>("idle");
	const [account, setAccount] = useState<AuthenticatedAccount | null>(null);
	const [message, setMessage] = useState<string | null>(null);
	const isLoading = status === "loading";
	const submitLabel = isLoading ? "Working…" : "Sign in";
	const messageClassName =
		status === "error" ? styles.errorMessage : styles.statusMessage;
	const messageRole = status === "error" ? "alert" : "status";

	async function handleSubmit(event: { preventDefault(): void }) {
		event.preventDefault();
		setStatus("loading");
		setMessage(null);

		try {
			const auth = getFirebaseClientAuth();
			const credentials = await signInWithEmailAndPassword(
				auth,
				email.trim(),
				password,
			);
			const idToken = await credentials.user.getIdToken();
			const session = await createAppSessionFromFirebaseIdToken(idToken);

			setAccount(session.account);
			setPassword("");
			setStatus("authenticated");
			setMessage("Signed in and app session created.");
		} catch (error) {
			setAccount(null);
			setStatus("error");
			setMessage(formatLoginError(error));
		}
	}

	async function handleLogout() {
		setStatus("loading");
		setMessage(null);

		const errors: string[] = [];

		try {
			await clearAppSession();
		} catch (error) {
			errors.push(formatLogoutError(error));
		}

		try {
			await signOut(getFirebaseClientAuth());
		} catch (error) {
			errors.push(formatLogoutError(error));
		}

		setAccount(null);
		setPassword("");

		if (errors.length > 0) {
			setStatus("error");
			setMessage(
				`Signed out locally, but cleanup reported: ${errors.join(" ")}`,
			);
			return;
		}

		setStatus("idle");
		setMessage("Signed out and app session cleared.");
	}

	return (
		<div className={styles.formShell}>
			<form className={styles.form} onSubmit={handleSubmit}>
				<label className={styles.field}>
					<span>Email</span>
					<input
						autoComplete="email"
						disabled={isLoading}
						onChange={(event) => setEmail(event.target.value)}
						required
						type="email"
						value={email}
					/>
				</label>
				<label className={styles.field}>
					<span>Password</span>
					<input
						autoComplete="current-password"
						disabled={isLoading}
						onChange={(event) => setPassword(event.target.value)}
						required
						type="password"
						value={password}
					/>
				</label>
				<button
					className={styles.primaryButton}
					disabled={isLoading}
					type="submit"
				>
					{submitLabel}
				</button>
			</form>

			{account ? (
				<section className={styles.accountPanel} aria-live="polite">
					<p className={styles.accountTitle}>App session active</p>
					<dl>
						<div>
							<dt>Email</dt>
							<dd>{account.email}</dd>
						</div>
						<div>
							<dt>Role</dt>
							<dd>{account.role}</dd>
						</div>
						<div>
							<dt>Email verified</dt>
							<dd>{account.emailVerified ? "Yes" : "No"}</dd>
						</div>
					</dl>
					<button
						className={styles.secondaryButton}
						disabled={isLoading}
						onClick={handleLogout}
						type="button"
					>
						Sign out
					</button>
				</section>
			) : null}

			{message ? (
				<p className={messageClassName} role={messageRole}>
					{message}
				</p>
			) : null}
		</div>
	);
}

function formatLoginError(error: unknown): string {
	if (error instanceof AuthSessionClientError && error.status === 403) {
		return "Firebase sign-in succeeded, but this identity is not linked to a TriskelWeb account yet.";
	}

	if (error instanceof AuthSessionClientError) {
		return error.message;
	}

	if (error instanceof FirebaseClientConfigurationError) {
		return error.message;
	}

	if (error instanceof Error) {
		return error.message;
	}

	return "Unable to sign in.";
}

function formatLogoutError(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}

	return "unknown error";
}
