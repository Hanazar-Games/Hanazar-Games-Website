"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useSettingsContext } from "./SettingsContext";
import { useTranslation } from "../hooks/useTranslation";
import { assetPath } from "../lib/paths";
import { currentRelease, hasSeenRelease, markReleaseSeen } from "../lib/release";

export default function ReleaseNotice() {
  const { loaded } = useSettingsContext();
  const { tr } = useTranslation();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const shownRef = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!loaded || !dialog || shownRef.current) return;
    let storage: Storage | null = null;
    try { storage = window.localStorage; } catch { /* Private contexts may block storage access. */ }
    if (storage && hasSeenRelease(storage, currentRelease.version)) return;
    let frame = 0;
    let previousOverflow: string | null = null;
    const restoreScroll = () => {
      if (previousOverflow === null) return;
      document.body.style.overflow = previousOverflow;
      previousOverflow = null;
    };
    const show = () => {
      frame = 0;
      if (shownRef.current || document.visibilityState !== "visible") return;
      if (storage && hasSeenRelease(storage, currentRelease.version)) return;
      if (document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]')) return;
      dialog.showModal();
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      shownRef.current = true;
      if (storage) markReleaseSeen(storage, currentRelease.version);
      observer.disconnect();
    };
    const schedule = () => {
      if (!frame && !shownRef.current) frame = window.requestAnimationFrame(show);
    };
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["open", "aria-modal"] });
    document.addEventListener("visibilitychange", schedule);
    dialog.addEventListener("close", restoreScroll);
    schedule();
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", schedule);
      dialog.removeEventListener("close", restoreScroll);
      if (dialog.open) dialog.close();
      restoreScroll();
    };
  }, [loaded]);

  const dismiss = () => dialogRef.current?.close();

  return (
    <dialog ref={dialogRef} className="releaseNotice" aria-labelledby="release-notice-title" aria-describedby="release-notice-summary">
      <div className="releaseNoticeToolbar">
        <span className="releaseNoticeVersion">{tr("releaseNew")} · v{currentRelease.version}</span>
        <button type="button" className="releaseNoticeClose" onClick={dismiss} aria-label={tr("releaseDismiss")} autoFocus>×</button>
      </div>
      <div className="releaseNoticeArtwork">
        <Image src={assetPath(currentRelease.image)} alt={tr("releaseArtworkAlt")} width={1200} height={600} sizes="(max-width: 700px) 94vw, 680px" />
      </div>
      <div className="releaseNoticeBody">
        <h2 id="release-notice-title">{tr(currentRelease.titleKey)}</h2>
        <p id="release-notice-summary">{tr("releaseNoticeSummary")}</p>
        <ul>{currentRelease.itemKeys.map(key => <li key={key}>{tr(key)}</li>)}</ul>
        <div className="releaseNoticeActions">
          <Link href="/games" onClick={dismiss}>{tr("releaseExploreGames")} <span aria-hidden="true">↗</span></Link>
          <Link href="/tools#web-tools" onClick={dismiss}>{tr("releaseExploreTools")} <span aria-hidden="true">↗</span></Link>
          <button type="button" onClick={dismiss}>{tr("releaseDismiss")}</button>
        </div>
      </div>
    </dialog>
  );
}
