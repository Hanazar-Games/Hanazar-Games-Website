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
        { key: "disableDecorations" as const, label: tr("stDisableDecorations") },
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

      <p className="settingDesc">{tr("stPerfDesc")}</p>
    </div>
  );
}
