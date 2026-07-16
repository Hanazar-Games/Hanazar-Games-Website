"use client";

import { useEffect, useState } from "react";
import { useSettingsContext } from "./SettingsContext";

export default function StyleApplier() {
  const { settings } = useSettingsContext();
  const [systemTheme, setSystemTheme] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined") return "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const syncSystemTheme = () => setSystemTheme(media.matches ? "dark" : "light");

    syncSystemTheme();
    media.addEventListener("change", syncSystemTheme);
    return () => media.removeEventListener("change", syncSystemTheme);
  }, []);

  useEffect(() => {
    const body = document.body;

    // Theme
    let effectiveTheme = settings.theme;
    if (effectiveTheme === "auto") {
      effectiveTheme = systemTheme;
    }
    body.setAttribute("data-theme", effectiveTheme);

    // Font
    const fontMap: Record<string, string> = {
      sans: "system-ui, -apple-system, Segoe UI, Roboto, Noto Sans, Ubuntu, Cantarell, Helvetica Neue, Arial, sans-serif",
      serif: "Georgia, Cambria, Times New Roman, Times, serif",
      mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace",
      rounded: "ui-rounded, Nunito, Varela Round, Quicksand, sans-serif",
      custom: settings.customFont || "system-ui, sans-serif",
    };
    body.style.fontFamily = fontMap[settings.font] || fontMap.sans;

    // Color preset
    body.setAttribute("data-preset", settings.colorPreset);

    // Contrast is scoped to content surfaces so fixed overlays remain viewport-bound.
    body.style.setProperty("--ui-contrast", String(settings.contrast / 100));

    // Reduce animations
    if (settings.reduceAnimations || !settings.animationsEnabled) {
      body.setAttribute("data-reduce-motion", "true");
    } else {
      body.removeAttribute("data-reduce-motion");
    }

    // Disable blur
    if (settings.disableBlur) {
      body.setAttribute("data-disable-blur", "true");
    } else {
      body.removeAttribute("data-disable-blur");
    }

    if (settings.disableDecorations) {
      body.setAttribute("data-disable-decorations", "true");
    } else {
      body.removeAttribute("data-disable-decorations");
    }

    // CSS stores a duration multiplier: 50% speed = 2x duration, 150% = 0.67x.
    const durationFactor = 100 / settings.animSpeed;
    body.style.setProperty("--anim-speed", String(durationFactor));

    // Individual animation toggles
    if (!settings.animUiFade) {
      body.setAttribute("data-disable-ui-fade", "true");
    } else {
      body.removeAttribute("data-disable-ui-fade");
    }

    if (!settings.animButtonHover) {
      body.setAttribute("data-disable-btn-hover", "true");
    } else {
      body.removeAttribute("data-disable-btn-hover");
    }

    if (!settings.animModal) {
      body.setAttribute("data-disable-modal-anim", "true");
    } else {
      body.removeAttribute("data-disable-modal-anim");
    }
  }, [
    settings.theme,
    settings.font,
    settings.customFont,
    settings.colorPreset,
    settings.contrast,
    settings.animationsEnabled,
    settings.reduceAnimations,
    settings.disableBlur,
    settings.disableDecorations,
    settings.animSpeed,
    settings.animUiFade,
    settings.animButtonHover,
    settings.animModal,
    systemTheme,
  ]);

  return null;
}
