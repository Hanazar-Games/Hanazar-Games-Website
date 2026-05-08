"use client";

import { useSettingsContext } from "../components/SettingsContext";
import { getTranslation } from "../lib/i18n";

export function useTranslation() {
  const { settings } = useSettingsContext();
  const lang = settings.language ?? "en";

  function tr(key: string): string {
    return getTranslation(lang as any, key);
  }

  return { tr, lang };
}
