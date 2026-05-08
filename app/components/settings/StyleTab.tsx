"use client";

import { useSettingsContext } from "../SettingsContext";
import { useTranslation } from "../../hooks/useTranslation";

const fontKeys = ["sans", "serif", "mono", "rounded", "custom"] as const;
const fontKeyMap: Record<string, string> = {
  sans: "fontDefaultSans",
  serif: "fontSerif",
  mono: "fontMono",
  rounded: "fontRounded",
  custom: "fontCustom",
};

const presets = [
  { key: "graphite", label: "Graphite", color: "#888888" },
  { key: "ocean", label: "Ocean", color: "#4a90d9" },
  { key: "emerald", label: "Emerald", color: "#50c878" },
  { key: "amber", label: "Amber", color: "#ffbf00" },
  { key: "rose", label: "Rose", color: "#e06c75" },
  { key: "lavender", label: "Lavender", color: "#b4a7d6" },
];

export default function StyleTab() {
  const { settings, update } = useSettingsContext();
  const { tr } = useTranslation();

  return (
    <div className="settingsTabContent">
      <div className="settingGroup">
        <span className="settingLabel">{tr("stTheme")}</span>
        <div className="segmented">
          {(["dark", "light", "auto"] as const).map((t) => (
            <button
              key={t}
              className={`seg-btn${settings.theme === t ? " active" : ""}`}
              onClick={() => update("theme", t)}
            >
              {tr(`theme${t.charAt(0).toUpperCase() + t.slice(1)}` as string)}
            </button>
          ))}
        </div>
      </div>

      <div className="settingGroup">
        <span className="settingLabel">{tr("stFont")}</span>
        <div className="segmented">
          {fontKeys.map((f) => (
            <button
              key={f}
              className={`seg-btn${settings.font === f ? " active" : ""}`}
              onClick={() => update("font", f as typeof settings.font)}
            >
              {tr(fontKeyMap[f])}
            </button>
          ))}
        </div>
        {settings.font === "custom" && (
          <input
            type="text"
            className="settingsInput"
            placeholder={tr("stCustomFontPlaceholder")}
            value={settings.customFont}
            onChange={(e) => update("customFont", e.target.value)}
          />
        )}
      </div>

      <div className="settingGroup">
        <span className="settingLabel">{tr("stColorPreset")}</span>
        <div className="colorPresetGrid">
          {presets.map((p) => (
            <button
              key={p.key}
              className={`colorPreset${settings.colorPreset === p.key ? " active" : ""}`}
              onClick={() => update("colorPreset", p.key)}
              title={p.label}
            >
              <span className="colorDot" style={{ background: p.color }} />
              <span className="colorLabel">{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="settingGroup">
        <div className="sliderHeader">
          <label className="settingLabel" htmlFor="contrast-slider">{tr("stContrast")}</label>
          <span className="sliderValue">{settings.contrast}%</span>
        </div>
        <input
          id="contrast-slider"
          type="range"
          className="rangeSlider"
          min={80}
          max={130}
          value={settings.contrast}
          onChange={(e) => update("contrast", Number(e.target.value))}
        />
      </div>
    </div>
  );
}
