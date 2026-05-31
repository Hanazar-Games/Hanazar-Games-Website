"use client";

import { useCallback, useEffect, useState } from "react";
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

export default function SettingsLauncher() {
  const [open, setOpen] = useState(false);
  const { settings, update } = useSettingsContext();
  const { tr } = useTranslation();

  const openSettings = useCallback(() => setOpen(true), []);
  const closeSettings = useCallback(() => setOpen(false), []);

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
        setOpen(true);
        return;
      }

      if (editable || !modifier) return;

      if (event.shiftKey && key === "l") {
        event.preventDefault();
        update("theme", settings.theme === "light" ? "dark" : "light");
        return;
      }

      if (!event.shiftKey && key === "m") {
        event.preventDefault();
        update("masterVolume", settings.masterVolume > 0 ? 0 : 80);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [settings.masterVolume, settings.theme, update]);

  return (
    <>
      <button
        className="settingsFloatingButton"
        type="button"
        onClick={openSettings}
        aria-label={tr("ariaOpenSettings")}
        title={tr("ariaOpenSettings")}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="3.2" />
          <path d="M19.4 13.5a7.8 7.8 0 0 0 0-3l2-1.4-2-3.4-2.4 1a7.8 7.8 0 0 0-2.6-1.5L12 2.7 8.1 3.4l-.4 2.5a7.8 7.8 0 0 0-2.6 1.5l-2.4-1-2 3.4 2 1.4a7.8 7.8 0 0 0 0 3l-2 1.4 2 3.4 2.4-1a7.8 7.8 0 0 0 2.6 1.5l.4 2.5 3.9.7 2.4-2.5a7.8 7.8 0 0 0 2.6-1.5l2.4 1 2-3.4-2-1.4Z" />
        </svg>
      </button>
      <SettingsPanel open={open} onClose={closeSettings} />
    </>
  );
}
