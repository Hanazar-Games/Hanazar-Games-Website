"use client";

import { useSettingsContext } from "../SettingsContext";

export default function ApiTab() {
  const { settings, update } = useSettingsContext();

  return (
    <div className="settingsTabContent">
      <div className="settingGroup">
        <label className="settingLabel" htmlFor="api-url">API Base URL</label>
        <input
          id="api-url"
          type="text"
          className="settingsInput"
          placeholder="https://api.example.com"
          value={settings.apiBaseUrl}
          onChange={(e) => update("apiBaseUrl", e.target.value)}
        />
      </div>

      <div className="settingGroup">
        <div className="sliderHeader">
          <label className="settingLabel" htmlFor="api-timeout">Timeout (ms)</label>
          <span className="sliderValue">{settings.apiTimeout}ms</span>
        </div>
        <input
          id="api-timeout"
          type="range"
          className="rangeSlider"
          min={5000}
          max={60000}
          step={1000}
          value={settings.apiTimeout}
          onChange={(e) => update("apiTimeout", Number(e.target.value))}
        />
      </div>

      <div className="settingGroup">
        <div className="sliderHeader">
          <label className="settingLabel" htmlFor="api-retries">Retry Count</label>
          <span className="sliderValue">{settings.apiRetries}</span>
        </div>
        <input
          id="api-retries"
          type="range"
          className="rangeSlider"
          min={0}
          max={10}
          value={settings.apiRetries}
          onChange={(e) => update("apiRetries", Number(e.target.value))}
        />
      </div>
    </div>
  );
}
