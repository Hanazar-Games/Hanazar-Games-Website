"use client";

import { useSettingsContext } from "../SettingsContext";

export default function AnimationTab() {
  const { settings, update } = useSettingsContext();

  return (
    <div className="settingsTabContent">
      <div className="settingRow">
        <span className="settingLabel" id="label-anim">Enable Animations</span>
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
          <label className="settingLabel" htmlFor="anim-speed">Animation Speed</label>
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
        <p className="settingDesc">Lower value means slower animations.</p>
      </div>

      <div className="settingGroup">
        <span className="settingLabel">Individual Effects</span>
        {[
          { key: "animUiFade" as const, label: "UI Fade In" },
          { key: "animButtonHover" as const, label: "Button Hover" },
          { key: "animModal" as const, label: "Modal Transition" },
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
