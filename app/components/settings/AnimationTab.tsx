"use client";

import { useSettingsContext } from "../SettingsContext";
import { useTranslation } from "../../hooks/useTranslation";

export default function AnimationTab() {
  const { settings, update } = useSettingsContext();
  const { tr } = useTranslation();
  const motionControlsDisabled = !settings.animationsEnabled || settings.reduceAnimations;

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

      <div className={`settingGroup${motionControlsDisabled ? " isDisabled" : ""}`}>
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
          disabled={motionControlsDisabled}
          onChange={(e) => update("animSpeed", Number(e.target.value))}
        />
        <p className="settingDesc">{tr("stAnimSpeedDesc")}</p>
        {settings.reduceAnimations ? (
          <p className="settingDesc settingNotice">{tr("stMotionOverridden")}</p>
        ) : null}
      </div>

      <div className={`settingGroup${motionControlsDisabled ? " isDisabled" : ""}`}>
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
                disabled={motionControlsDisabled}
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
