"use client";

import { useEffect } from "react";
import { useSettingsContext } from "./SettingsContext";

export default function StyleApplier() {
  const { settings } = useSettingsContext();

  useEffect(() => {
    const body = document.body;

    // Theme
    let effectiveTheme = settings.theme;
    if (effectiveTheme === "auto") {
      effectiveTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
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

    // Contrast
    body.style.filter = settings.contrast !== 100 ? `contrast(${settings.contrast}%)` : "";

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

    // Animation speed as CSS custom property (base 1s, scaled by animSpeed%)
    const speedFactor = settings.animSpeed / 100;
    body.style.setProperty("--anim-speed", String(speedFactor));

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
    settings.animSpeed,
    settings.animUiFade,
    settings.animButtonHover,
    settings.animModal,
  ]);

  return null;
}
