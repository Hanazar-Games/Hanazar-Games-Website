"use client";

import { useSettingsContext } from "../SettingsContext";
import { useTranslation } from "../../hooks/useTranslation";
import { langNames, type LangCode } from "../../lib/i18n";

const languages = Object.entries(langNames).map(([code, name]) => ({
  code: code as LangCode,
  name,
}));

const nativeNames: Partial<Record<LangCode, string>> = {
  "zh-CN": "简体中文",
  ja: "日本語",
  en: "English",
};

export default function LanguageTab({
  allowedCodes,
  value,
  onChange,
}: {
  allowedCodes?: readonly LangCode[];
  value?: LangCode;
  onChange?: (language: LangCode) => void;
}) {
  const { settings, update } = useSettingsContext();
  const { tr } = useTranslation();
  const selectedLanguage = value ?? (settings.language as LangCode);
  const visibleLanguages = allowedCodes
    ? allowedCodes.map((code) => ({ code, name: nativeNames[code] ?? langNames[code] }))
    : languages;

  return (
    <div className="settingsTabContent">
      <div className="settingGroup">
        <span className="settingLabel">{tr("stInterfaceLang")}</span>
        <p className="settingDesc">
          {tr("stLangDesc")}
        </p>
        <div className="languageList">
          {visibleLanguages.map((lang) => (
            <button
              key={lang.code}
              type="button"
              className={`languageItem${selectedLanguage === lang.code ? " active" : ""}`}
              onClick={() => onChange ? onChange(lang.code) : update("language", lang.code)}
              aria-pressed={selectedLanguage === lang.code}
            >
              <span className="languageName">{lang.name}</span>
              <span className="languageCode">{lang.code}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
