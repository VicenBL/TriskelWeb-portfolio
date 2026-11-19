import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { publishedLegalDocuments, type LegalDocumentSlug } from "../../../components/legal/legal-documents";
import styles from "./legal.module.css";

export const dynamicParams = false;

export function generateStaticParams() {
	return Object.keys(publishedLegalDocuments).map((legalDocument) => ({ legalDocument }));
}

export default async function LegalPage({ params }: { params: Promise<{ legalDocument: string }> }) {
	const { legalDocument } = await params;
	const document = Object.hasOwn(publishedLegalDocuments, legalDocument)
		? publishedLegalDocuments[legalDocument as LegalDocumentSlug]
		: undefined;
	if (!document) notFound();

	return (
		<main className={styles.document}>
			<Link href="/">Triskel — Inicio</Link>
			<h1>{document.title}</h1>
			<p>Revisado: <time dateTime={document.reviewedOn}>{document.reviewedOn}</time></p>
			{document.sections.map(({ heading, paragraphs }) => (
				<section key={heading}>
					<h2>{heading}</h2>
					{paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
				</section>
			))}
		</main>
	);
}
