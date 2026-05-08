"use client";

import { useSettingsContext } from "../SettingsContext";

const languages = [
  { code: "zh-CN", name: "Simplified Chinese" },
  { code: "zh-TW", name: "Traditional Chinese" },
  { code: "en", name: "English" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "es", name: "Spanish" },
  { code: "ru", name: "Russian" },
  { code: "pt", name: "Portuguese" },
  { code: "it", name: "Italian" },
  { code: "nl", name: "Dutch" },
  { code: "pl", name: "Polish" },
  { code: "tr", name: "Turkish" },
  { code: "vi", name: "Vietnamese" },
  { code: "id", name: "Indonesian" },
  { code: "uk", name: "Ukrainian" },
  { code: "el", name: "Greek" },
  { code: "cs", name: "Czech" },
  { code: "sv", name: "Swedish" },
];

export default function LanguageTab() {
  const { settings, update } = useSettingsContext();

  return (
    <div className="settingsTabContent">
      <div className="settingGroup">
        <span className="settingLabel">Interface Language</span>
        <p className="settingDesc">
          Select your preferred display language. Content language is not affected.
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
