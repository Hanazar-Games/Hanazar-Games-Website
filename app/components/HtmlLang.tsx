"use client";

import { useEffect } from "react";
import { useSettingsContext } from "./SettingsContext";

export default function HtmlLang() {
  const { settings } = useSettingsContext();

  useEffect(() => {
    document.documentElement.lang = settings.language;
  }, [settings.language]);

  return null;
}
