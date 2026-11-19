import { describe, expect, it } from "vitest";
import LegalPage, { generateStaticParams } from "../../app/(legal)/[legalDocument]/page";

describe("unpublished legal documents", () => {
	it.each(["aviso-legal", "privacidad", "cookies"])("does not publish /%s without an approved document", async (legalDocument) => {
		await expect(LegalPage({ params: Promise.resolve({ legalDocument }) })).rejects.toThrow();
	});
	it("does not prebuild incomplete policies", () => {
		expect(generateStaticParams()).toEqual([]);
	});
});
