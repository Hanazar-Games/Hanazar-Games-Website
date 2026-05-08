"use client";

import { useSettingsContext } from "../SettingsContext";
import { useTranslation } from "../../hooks/useTranslation";

export default function AnimationTab() {
  const { settings, update } = useSettingsContext();
  const { tr } = useTranslation();

  return (
    <div className="settingsTabContent">
      <div className="settingRow">
        <span className="settingLabel" id="label-anim">{tr("stEnableAnim")}</span>
        <label className="switch">
          <input
            type="checkbox"
            checked={settings.animationsEnabled}
            onChange={(e) => update("animationsEnabled", e.target.checked)}
            aria-labelledby="label-anim"
          />
          <span className="slider" />
        </label>
      </div>

      <div className="settingGroup">
        <div className="sliderHeader">
          <label className="settingLabel" htmlFor="anim-speed">{tr("stAnimSpeed")}</label>
          <span className="sliderValue">{settings.animSpeed}%</span>
        </div>
        <input
          id="anim-speed"
          type="range"
          className="rangeSlider"
          min={50}
          max={150}
          value={settings.animSpeed}
          onChange={(e) => update("animSpeed", Number(e.target.value))}
        />
        <p className="settingDesc">{tr("stAnimSpeedDesc")}</p>
      </div>

      <div className="settingGroup">
        <span className="settingLabel">{tr("stIndivEffects")}</span>
        {[
          { key: "animUiFade" as const, label: tr("stUiFade") },
          { key: "animButtonHover" as const, label: tr("stBtnHover") },
          { key: "animModal" as const, label: tr("stModalTrans") },
        ].map((item) => (
          <div className="settingRow" key={item.key}>
            <span className="settingLabel sub" id={`label-${item.key}`}>{item.label}</span>
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
      </div>
    </div>
  );
}
