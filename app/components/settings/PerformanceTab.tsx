"use client";

import { useSettingsContext } from "../SettingsContext";
import { useTranslation } from "../../hooks/useTranslation";

export default function PerformanceTab() {
  const { settings, update } = useSettingsContext();
  const { tr } = useTranslation();

  return (
    <div className="settingsTabContent">
      {[
        { key: "reduceAnimations" as const, label: tr("stReduceAnim") },
        { key: "disableBlur" as const, label: tr("stDisableBlur") },
        { key: "lowResPreview" as const, label: tr("stLowRes") },
        { key: "lazyLoad" as const, label: tr("stLazyLoad") },
        { key: "disableParticles" as const, label: tr("stDisableParticles") },
        { key: "aggressiveCache" as const, label: tr("stAggressiveCache") },
        { key: "devMode" as const, label: tr("stDevMode") },
      ].map((item) => (
        <div className="settingRow" key={item.key}>
          <span className="settingLabel" id={`label-${item.key}`}>{item.label}</span>
          <label className="switch">
            <input
              type="checkbox"
              checked={settings[item.key]}
              onChange={(e) => update(item.key, e.target.checked)}
              aria-labelledby={`label-${item.key}`}
            />
            <span className="slider" />
          </label>
        </div>
      ))}

      <div className="settingGroup">
        <div className="sliderHeader">
          <label className="settingLabel" htmlFor="max-concurrent">{tr("stMaxConcurrent")}</label>
          <span className="sliderValue">{settings.maxConcurrent}</span>
        </div>
        <input
          id="max-concurrent"
          type="range"
          className="rangeSlider"
          min={1}
          max={10}
          value={settings.maxConcurrent}
          onChange={(e) => update("maxConcurrent", Number(e.target.value))}
        />
      </div>

      <p className="settingDesc">{tr("stPerfDesc")}</p>
    </div>
  );
}
