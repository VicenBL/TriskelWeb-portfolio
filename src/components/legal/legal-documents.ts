export type LegalDocumentSlug = "aviso-legal" | "privacidad" | "cookies";

export type PublishedLegalDocument = Readonly<{
	title: string;
	reviewedOn: string;
	sections: readonly Readonly<{ heading: string; paragraphs: readonly string[] }>[];
}>;

// Add only complete, owner-approved texts after the legal review. No drafts or personal working data.
export const publishedLegalDocuments: Readonly<Partial<Record<LegalDocumentSlug, PublishedLegalDocument>>> = {};
