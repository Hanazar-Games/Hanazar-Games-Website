"use client";

import { useCallback } from "react";
import { useSettingsContext } from "../components/SettingsContext";
import { getTranslation } from "../lib/i18n";

export function useTranslation() {
  const { settings } = useSettingsContext();
  const lang = settings.language ?? "en";

  const tr = useCallback((key: string) => getTranslation(lang as any, key), [lang]);

  return { tr, lang };
}
