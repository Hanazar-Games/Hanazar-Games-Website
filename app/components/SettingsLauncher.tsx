"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import SettingsPanel from "./SettingsPanel";
import { useSettingsContext } from "./SettingsContext";
import { useTranslation } from "../hooks/useTranslation";

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    target.isContentEditable
  );
}

function MainSettingsLauncher() {
  const [open, setOpen] = useState(false);
  const [shortcutStatus, setShortcutStatus] = useState("");
  const lastVolumeRef = useRef(80);
  const statusTimerRef = useRef<number | null>(null);
  const { settings, update } = useSettingsContext();
  const { tr } = useTranslation();

  const openSettings = useCallback(() => {
    if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
    setOpen(true);
  }, []);
  const closeSettings = useCallback(() => setOpen(false), []);
  const showShortcutStatus = useCallback((message: string) => {
    if (statusTimerRef.current !== null) window.clearTimeout(statusTimerRef.current);
    setShortcutStatus(message);
    statusTimerRef.current = window.setTimeout(() => {
      setShortcutStatus("");
      statusTimerRef.current = null;
    }, 1600);
  }, []);

  useEffect(() => {
    if (settings.masterVolume > 0) lastVolumeRef.current = settings.masterVolume;
  }, [settings.masterVolume]);

  useEffect(() => () => {
    if (statusTimerRef.current !== null) window.clearTimeout(statusTimerRef.current);
  }, []);

  useEffect(() => {
    window.addEventListener("hanazar:open-settings", openSettings);
    return () => window.removeEventListener("hanazar:open-settings", openSettings);
  }, [openSettings]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const modifier = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      const editable = isEditableTarget(event.target);

      if (modifier && key === ",") {
        event.preventDefault();
        openSettings();
        return;
      }

      if (editable || !modifier) return;

      if (event.shiftKey && key === "l") {
        event.preventDefault();
        const currentTheme = document.body.dataset.theme ?? settings.theme;
        const nextTheme = currentTheme === "light" ? "dark" : "light";
        update("theme", nextTheme);
        showShortcutStatus(tr(nextTheme === "light" ? "shortcutLightTheme" : "shortcutDarkTheme"));
        return;
      }

      if (!event.shiftKey && key === "m") {
        event.preventDefault();
        if (settings.masterVolume > 0) {
          lastVolumeRef.current = settings.masterVolume;
          update("masterVolume", 0);
          showShortcutStatus(tr("shortcutMuted"));
        } else {
          update("masterVolume", lastVolumeRef.current);
          showShortcutStatus(tr("shortcutVolumeRestored"));
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openSettings, settings.masterVolume, settings.theme, showShortcutStatus, tr, update]);

  return (
    <>
      <button
        className="settingsFloatingButton"
        type="button"
        onClick={openSettings}
        aria-label={tr("ariaOpenSettings")}
        aria-controls="project-settings-dialog"
        aria-expanded={open}
        aria-haspopup="dialog"
        title={tr("ariaOpenSettings")}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="3.2" />
          <path d="M19.4 13.5a7.8 7.8 0 0 0 0-3l2-1.4-2-3.4-2.4 1a7.8 7.8 0 0 0-2.6-1.5L12 2.7 8.1 3.4l-.4 2.5a7.8 7.8 0 0 0-2.6 1.5l-2.4-1-2 3.4 2 1.4a7.8 7.8 0 0 0 0 3l-2 1.4 2 3.4 2.4-1a7.8 7.8 0 0 0 2.6 1.5l.4 2.5 3.9.7 2.4-2.5a7.8 7.8 0 0 0 2.6-1.5l2.4 1 2-3.4-2-1.4Z" />
        </svg>
      </button>
      <SettingsPanel open={open} onClose={closeSettings} />
      {shortcutStatus ? (
        <div className="shortcutToast" role="status" aria-live="polite">
          {shortcutStatus}
        </div>
      ) : null}
    </>
  );
}

export default function SettingsLauncher() {
  const pathname = usePathname();
  return pathname.startsWith("/skin-service") ? null : <MainSettingsLauncher />;
}
