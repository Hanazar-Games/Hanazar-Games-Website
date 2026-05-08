"use client";

import { useSettingsContext } from "../SettingsContext";

export default function PerformanceTab() {
  const { settings, update } = useSettingsContext();

  return (
    <div className="settingsTabContent">
      {[
        { key: "reduceAnimations" as const, label: "Reduce Animations" },
        { key: "disableBlur" as const, label: "Disable Glassmorphism Blur" },
        { key: "lowResPreview" as const, label: "Low Resolution Preview" },
        { key: "lazyLoad" as const, label: "Lazy Load Modules" },
        { key: "disableParticles" as const, label: "Disable Particle Effects" },
        { key: "aggressiveCache" as const, label: "Aggressive Cache Strategy" },
        { key: "devMode" as const, label: "Developer Debug Mode" },
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
          <label className="settingLabel" htmlFor="max-concurrent">Max Concurrent Requests</label>
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

      <p className="settingDesc">Disabling visual effects improves performance on low-end devices.</p>
    </div>
  );
}
