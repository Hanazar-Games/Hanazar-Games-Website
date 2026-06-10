"use client";

import { useSettingsContext } from "../SettingsContext";
import { useTranslation } from "../../hooks/useTranslation";

const sfxStyles = [
  "Classic", "Electronic", "Retro", "Wood", "Bell", "Space",
  "Drum", "Piano", "Synth", "Chiptune", "Pluck", "Crystal"
];

export default function AudioTab() {
  const { settings, update } = useSettingsContext();
  const { tr } = useTranslation();
  const selectedSfxStyle = sfxStyles.find(
    (style) => style.toLowerCase() === settings.sfxStyle.toLowerCase()
  ) ?? settings.sfxStyle;
  const previewSfx = () => {
    window.dispatchEvent(new CustomEvent("hanazar:sfx-preview"));
  };

  return (
    <div className="settingsTabContent">
      <div className="settingGroup">
        <div className="sliderHeader">
          <label className="settingLabel" htmlFor="master-vol">{tr("stMasterVolume")}</label>
          <span className="sliderValue">{settings.masterVolume}%</span>
        </div>
        <input
          id="master-vol"
          type="range"
          className="rangeSlider"
          min={0}
          max={100}
          value={settings.masterVolume}
          onChange={(e) => update("masterVolume", Number(e.target.value))}
        />
        <div className="audioPreviewRow">
          <button className="settingsBtn" type="button" data-sfx-preview onClick={previewSfx}>
            {tr("stPreviewSfx")}
          </button>
        </div>
      </div>

      <div className="settingGroup">
        <div className="settingRow">
          <span className="settingLabel" id="label-sfx">{tr("stSfx")}</span>
          <label className="switch">
            <input
              type="checkbox"
              checked={settings.sfxEnabled}
              onChange={(e) => update("sfxEnabled", e.target.checked)}
              aria-labelledby="label-sfx"
            />
            <span className="slider" />
          </label>
        </div>
        <div className="sliderHeader">
          <label className="settingLabel sub" htmlFor="sfx-vol">{tr("stSfxVolume")}</label>
          <span className="sliderValue">{settings.sfxVolume}%</span>
        </div>
        <input
          id="sfx-vol"
          type="range"
          className="rangeSlider"
          min={0}
          max={100}
          value={settings.sfxVolume}
          onChange={(e) => update("sfxVolume", Number(e.target.value))}
        />
        <span className="settingLabel sub">{tr("stSfxStyle")}</span>
        <div className="segmented">
          {sfxStyles.map((s) => (
            <button
              key={s}
              className={`seg-btn${selectedSfxStyle === s ? " active" : ""}`}
              onClick={() => update("sfxStyle", s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
