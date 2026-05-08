"use client";

import { useSettingsContext } from "../SettingsContext";
import { useTranslation } from "../../hooks/useTranslation";
import { langNames, type LangCode } from "../../lib/i18n";

const languages = Object.entries(langNames).map(([code, name]) => ({
  code: code as LangCode,
  name,
}));

export default function LanguageTab() {
  const { settings, update } = useSettingsContext();
  const { tr } = useTranslation();

  return (
    <div className="settingsTabContent">
      <div className="settingGroup">
        <span className="settingLabel">{tr("stInterfaceLang")}</span>
        <p className="settingDesc">
          {tr("stLangDesc")}
        </p>
        <div className="languageList">
          {languages.map((lang) => (
            <button
              key={lang.code}
              className={`languageItem${settings.language === lang.code ? " active" : ""}`}
              onClick={() => update("language", lang.code)}
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
