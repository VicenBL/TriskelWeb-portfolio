import React from "react";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
	title: "Triskel | Folk metal",
	robots: { index: false, follow: false, nocache: true },
	description: "Triskel: banda de folk metal de Cartagena (Murcia), con influencias rock y celtas.",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="es">
			<body>{children}</body>
		</html>
	);
}
