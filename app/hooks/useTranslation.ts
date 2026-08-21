"use client";

import { useCallback } from "react";
import { usePathname } from "next/navigation";
import { useSettingsContext } from "../components/SettingsContext";
import { getTranslation } from "../lib/i18n";
import { useSkinServiceLanguage } from "./useSkinServiceLanguage";

export function useTranslation() {
  const pathname = usePathname();
  const { settings } = useSettingsContext();
  const skinLanguage = useSkinServiceLanguage();
  const lang = pathname.includes("/skin-service") ? skinLanguage : settings.language ?? "en";

  const tr = useCallback((key: string) => getTranslation(lang as any, key), [lang]);

  return { tr, lang };
}
