"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSettingsContext } from "./SettingsContext";
import { useSkinServiceLanguage } from "../hooks/useSkinServiceLanguage";

export default function HtmlLang() {
  const pathname = usePathname();
  const { settings } = useSettingsContext();
  const skinLanguage = useSkinServiceLanguage();
  const language = pathname.includes("/skin-service") ? skinLanguage : settings.language;

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return null;
}
