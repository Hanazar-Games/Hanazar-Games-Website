"use client";

import { useEffect, useState } from "react";
import { sfxStyles, useSettingsContext } from "../SettingsContext";
import type { BgmPlaybackState } from "../AudioEngine";
import { useTranslation } from "../../hooks/useTranslation";

const bgmStateKeys: Record<BgmPlaybackState, string> = {
  off: "stBgmStateOff",
  muted: "stBgmStateMuted",
  waiting: "stBgmStateWaiting",
  playing: "stBgmStatePlaying",
  paused: "stBgmStatePaused",
  unavailable: "stBgmStateUnavailable",
};

export default function AudioTab() {
  const { settings, update } = useSettingsContext();
  const { tr } = useTranslation();
  const [bgmState, setBgmState] = useState<BgmPlaybackState>(() => {
    if (!settings.bgmEnabled) return "off";
    if (settings.masterVolume === 0 || settings.bgmVolume === 0) return "muted";
    return "waiting";
  });
  const selectedSfxStyle = sfxStyles.find(
    (style) => style.toLowerCase() === settings.sfxStyle.toLowerCase()
  ) ?? settings.sfxStyle;
  const previewSfx = (style?: string) => {
    window.dispatchEvent(new CustomEvent("hanazar:sfx-preview", { detail: { style } }));
  };
  const selectSfxStyle = (style: string) => {
    update("sfxStyle", style);
    previewSfx(style);
  };

  useEffect(() => {
    const handleState = (event: Event) => {
      const state = (event as CustomEvent<{ state?: BgmPlaybackState }>).detail?.state;
      if (state && Object.prototype.hasOwnProperty.call(bgmStateKeys, state)) {
        setBgmState(state);
      }
    };
    window.addEventListener("hanazar:bgm-state", handleState);
    window.dispatchEvent(new Event("hanazar:bgm-state-request"));
    return () => window.removeEventListener("hanazar:bgm-state", handleState);
  }, []);

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
          <button
            className="settingsBtn"
            type="button"
            data-sfx-preview
            onClick={() => previewSfx()}
            disabled={!settings.sfxEnabled || settings.masterVolume === 0 || settings.sfxVolume === 0}
          >
            {tr("stPreviewSfx")}
          </button>
        </div>
      </div>

      <div className="settingGroup">
        <div className="settingRow">
          <span className="settingLabel" id="label-sfx">{tr("stSfx")}</span>
          <label className="switch" data-audio-unlock>
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
          disabled={!settings.sfxEnabled}
          onChange={(e) => update("sfxVolume", Number(e.target.value))}
        />
        <span className="settingLabel sub">{tr("stSfxStyle")}</span>
        <div className="segmented">
          {sfxStyles.map((s) => (
            <button
              key={s}
              type="button"
              data-sfx-preview
              className={`seg-btn${selectedSfxStyle === s ? " active" : ""}`}
              onClick={() => selectSfxStyle(s)}
              aria-pressed={selectedSfxStyle === s}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="settingGroup">
        <div className="settingRow">
          <div>
            <span className="settingLabel" id="label-bgm">{tr("stBgm")}</span>
            <p className="settingDesc compact">{tr("stBgmDesc")}</p>
          </div>
          <label className="switch" data-audio-unlock>
            <input
              type="checkbox"
              checked={settings.bgmEnabled}
              onChange={(e) => update("bgmEnabled", e.target.checked)}
              aria-labelledby="label-bgm"
            />
            <span className="slider" />
          </label>
        </div>
        <div className="sliderHeader">
          <label className="settingLabel sub" htmlFor="bgm-vol">{tr("stBgmVolume")}</label>
          <span className="sliderValue">{settings.bgmVolume}%</span>
        </div>
        <input
          id="bgm-vol"
          type="range"
          className="rangeSlider"
          min={0}
          max={100}
          value={settings.bgmVolume}
          disabled={!settings.bgmEnabled}
          onChange={(e) => update("bgmVolume", Number(e.target.value))}
        />
        <p className={`audioState audioState-${bgmState}`} role="status" aria-live="polite">
          <span className="audioStateDot" aria-hidden="true" />
          {tr(bgmStateKeys[bgmState])}
        </p>
      </div>
    </div>
  );
}
