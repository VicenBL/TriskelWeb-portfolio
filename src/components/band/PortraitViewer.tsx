"use client";

import Image from "../preview/PrivateImage";
import React, { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { bandMembers } from "./members";
import styles from "./gallery.module.css";

export function PortraitViewer({ children }: { children: ReactNode }) {
	const dialog = useRef<HTMLDialogElement>(null);
	const trigger = useRef<HTMLAnchorElement | null>(null);
	const [selected, setSelected] = useState<number | null>(null);
	const member = selected === null ? null : bandMembers[selected];

	useEffect(() => {
		if (selected !== null && !dialog.current?.open) dialog.current?.showModal();
	}, [selected]);

	function openPortrait(event: MouseEvent<HTMLDivElement>) {
		const link = (event.target as Element).closest<HTMLAnchorElement>("a[data-portrait-index]");
		if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || typeof dialog.current?.showModal !== "function") return;
		const index = Number(link.dataset.portraitIndex);
		if (!bandMembers[index]) return;
		event.preventDefault();
		trigger.current = link;
		setSelected(index);
	}

	function move(direction: number) {
		setSelected(index => index === null ? null : (index + direction + bandMembers.length) % bandMembers.length);
	}

	return (
		<div onClick={openPortrait}>
			{children}
			<dialog ref={dialog} className={styles.viewer} aria-labelledby="portrait-viewer-title"
				onClose={() => { setSelected(null); trigger.current?.focus({ preventScroll: true }); }}
				onKeyDown={event => {
					if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
						event.preventDefault();
						move(event.key === "ArrowRight" ? 1 : -1);
						return;
					}
					if (event.key === "Tab") {
						const buttons = dialog.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
						if (!buttons?.length) return;
						const first = buttons[0];
						const last = buttons[buttons.length - 1];
						if (event.shiftKey && document.activeElement === first) {
							event.preventDefault();
							last.focus();
						} else if (!event.shiftKey && document.activeElement === last) {
							event.preventDefault();
							first.focus();
						}
					}
				}}>
				<div className={styles.viewerTop}>
					<p id="portrait-viewer-title" aria-live="polite">{member ? `${member.name} — ${member.role}` : "Fotografía de Triskel"}</p>
					<button type="button" aria-label="Cerrar fotografía" onClick={() => dialog.current?.close()}>
						<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m6 6 12 12M18 6 6 18" /></svg>
					</button>
				</div>
				<div className={styles.viewerImage}>
					{member && <Image key={member.id} src={member.photo} alt={member.alt} width={member.width} height={member.height} loading="eager" sizes="(max-width: 1200px) 92vw, 1100px" />}
				</div>
				<div className={styles.viewerNavigation}>
					<button type="button" aria-label="Fotografía anterior" onClick={() => move(-1)}>Anterior</button>
					<span>{selected === null ? "" : `${selected + 1} / ${bandMembers.length}`}</span>
					<button type="button" aria-label="Fotografía siguiente" onClick={() => move(1)}>Siguiente</button>
				</div>
			</dialog>
		</div>
	);
}
