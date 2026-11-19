import Link from "next/link";
import { LoginForm } from "./LoginForm";
import styles from "./login.module.css";
import { requirePreviewPage } from "../../services/preview-page-guard";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
	await requirePreviewPage();
	return (
		<main className={styles.main} lang="en">
			<section className={styles.card}>
				<Link className={styles.backLink} href="/">
					← Back to foundation
				</Link>
				<p className={styles.eyebrow}>Authentication</p>
				<h1>Customer login</h1>
				<p className={styles.description}>
					Sign in with Firebase email/password, then bridge the verified
					Firebase identity into a TriskelWeb HTTP-only app session.
				</p>
				<LoginForm />
			</section>
		</main>
	);
}
