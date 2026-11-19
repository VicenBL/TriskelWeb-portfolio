import React from "react";
import type { Metadata } from "next";
import { ConstructionScreen } from "../../components/preview/ConstructionScreen";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
	title: "En construcción | Triskel",
	robots: { index: false, follow: false },
};

export default function ConstructionPage() {
	return <ConstructionScreen />;
}
