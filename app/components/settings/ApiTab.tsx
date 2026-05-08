"use client";

import { useSettingsContext } from "../SettingsContext";
import { useTranslation } from "../../hooks/useTranslation";

export default function ApiTab() {
  const { settings, update } = useSettingsContext();
  const { tr } = useTranslation();

  return (
    <div className="settingsTabContent">
      <div className="settingGroup">
        <label className="settingLabel" htmlFor="api-url">{tr("stApiUrl")}</label>
        <input
          id="api-url"
          type="text"
          className="settingsInput"
          placeholder={tr("stApiPlaceholder")}
          value={settings.apiBaseUrl}
          onChange={(e) => update("apiBaseUrl", e.target.value)}
        />
      </div>

      <div className="settingGroup">
        <div className="sliderHeader">
          <label className="settingLabel" htmlFor="api-timeout">{tr("stApiTimeout")}</label>
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
          <label className="settingLabel" htmlFor="api-retries">{tr("stApiRetries")}</label>
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
