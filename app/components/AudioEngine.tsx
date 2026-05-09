"use client";

import { useCallback, useEffect, useRef } from "react";
import { useSettingsContext } from "./SettingsContext";

type ManagedNode = {
  stop: () => void;
};

const sfxProfiles: Record<string, { wave: OscillatorType; start: number; end: number; duration: number }> = {
  Classic: { wave: "sine", start: 660, end: 440, duration: 0.11 },
  Electronic: { wave: "sawtooth", start: 880, end: 520, duration: 0.09 },
  Retro: { wave: "square", start: 740, end: 370, duration: 0.08 },
  Wood: { wave: "triangle", start: 360, end: 260, duration: 0.08 },
  Bell: { wave: "sine", start: 1040, end: 780, duration: 0.16 },
  Space: { wave: "sine", start: 520, end: 920, duration: 0.18 },
  Drum: { wave: "triangle", start: 180, end: 80, duration: 0.07 },
  Piano: { wave: "triangle", start: 620, end: 620, duration: 0.12 },
  Synth: { wave: "sawtooth", start: 640, end: 980, duration: 0.13 },
  Chiptune: { wave: "square", start: 988, end: 494, duration: 0.08 },
  Pluck: { wave: "triangle", start: 720, end: 360, duration: 0.1 },
  Crystal: { wave: "sine", start: 1320, end: 990, duration: 0.14 },
};

const bgmProfiles: Record<string, { wave: OscillatorType; root: number; fifth: number; drift: number }> = {
  Orchestral: { wave: "triangle", root: 110, fifth: 164.81, drift: 0.05 },
  Ambient: { wave: "sine", root: 98, fifth: 146.83, drift: 0.035 },
  Electronic: { wave: "sawtooth", root: 123.47, fifth: 185, drift: 0.06 },
  Piano: { wave: "triangle", root: 130.81, fifth: 196, drift: 0.025 },
  Synthwave: { wave: "sawtooth", root: 87.31, fifth: 130.81, drift: 0.07 },
  Nature: { wave: "sine", root: 82.41, fifth: 123.47, drift: 0.03 },
  Jazz: { wave: "triangle", root: 116.54, fifth: 174.61, drift: 0.045 },
  Meditation: { wave: "sine", root: 73.42, fifth: 110, drift: 0.02 },
  Cyber: { wave: "square", root: 103.83, fifth: 155.56, drift: 0.055 },
  "Lo-Fi": { wave: "triangle", root: 92.5, fifth: 138.59, drift: 0.04 },
  Rock: { wave: "sawtooth", root: 110, fifth: 164.81, drift: 0.045 },
  Blues: { wave: "triangle", root: 98, fifth: 146.83, drift: 0.035 },
};

function resolveStyleName(style: string, options: string[]) {
  return options.find((option) => option.toLowerCase() === style.toLowerCase()) ?? style;
}

function getSfxProfile(style: string) {
  const resolved = resolveStyleName(style, Object.keys(sfxProfiles));
  return sfxProfiles[resolved] ?? sfxProfiles.Classic;
}

function getBgmProfile(style: string) {
  const resolved = resolveStyleName(style, Object.keys(bgmProfiles));
  const known = bgmProfiles[resolved];
  if (known) return known;

  const roots = [73.42, 82.41, 87.31, 92.5, 98, 103.83, 110, 123.47];
  const waves: OscillatorType[] = ["sine", "triangle", "sawtooth"];
  const seed = Array.from(resolved).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const root = roots[seed % roots.length];

  return {
    wave: waves[seed % waves.length],
    root,
    fifth: root * 1.5,
    drift: 0.02 + (seed % 7) * 0.007,
  };
}

export default function AudioEngine() {
  const { settings } = useSettingsContext();
  const audioRef = useRef<AudioContext | null>(null);
  const bgmRef = useRef<ManagedNode | null>(null);
  const unlockedRef = useRef(false);
  const settingsRef = useRef(settings);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const getContext = useCallback(() => {
    if (typeof window === "undefined") return null;
    const audioWindow = window as Window &
      typeof globalThis & { webkitAudioContext?: typeof AudioContext };
    const AudioContextClass = audioWindow.AudioContext || audioWindow.webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioRef.current) audioRef.current = new AudioContextClass();
    return audioRef.current;
  }, []);

  const unlock = useCallback(async () => {
    const ctx = getContext();
    if (!ctx) return;
    if (ctx.state === "suspended") await ctx.resume();
    unlockedRef.current = true;
  }, [getContext]);

  const playSfx = useCallback(() => {
    const current = settingsRef.current;
    if (!current.sfxEnabled || current.masterVolume <= 0 || current.sfxVolume <= 0) return;

    const ctx = getContext();
    if (!ctx || ctx.state !== "running") return;

    const profile = getSfxProfile(current.sfxStyle);
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const volume = Math.min(0.14, (current.masterVolume / 100) * (current.sfxVolume / 100) * 0.18);

    osc.type = profile.wave;
    osc.frequency.setValueAtTime(profile.start, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, profile.end), now + profile.duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + profile.duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + profile.duration + 0.02);
  }, [getContext]);

  const stopBgm = useCallback(() => {
    bgmRef.current?.stop();
    bgmRef.current = null;
  }, []);

  const startBgm = useCallback(() => {
    const current = settingsRef.current;
    const ctx = getContext();
    if (!ctx || ctx.state !== "running" || bgmRef.current) return;
    if (!current.bgmEnabled || current.masterVolume <= 0 || current.bgmVolume <= 0) return;

    const profile = getBgmProfile(current.bgmStyle);
    const now = ctx.currentTime;
    const output = ctx.createGain();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const root = ctx.createOscillator();
    const fifth = ctx.createOscillator();
    const air = ctx.createOscillator();
    const volume = Math.min(0.055, (current.masterVolume / 100) * (current.bgmVolume / 100) * 0.08);

    output.gain.setValueAtTime(0.0001, now);
    output.gain.linearRampToValueAtTime(volume, now + 1.2);

    lfo.type = "sine";
    lfo.frequency.value = profile.drift;
    lfoGain.gain.value = 2.5;
    lfo.connect(lfoGain);

    for (const osc of [root, fifth, air]) {
      osc.type = profile.wave;
      lfoGain.connect(osc.detune);
      osc.connect(output);
      osc.start(now);
    }

    root.frequency.value = profile.root;
    fifth.frequency.value = profile.fifth;
    air.frequency.value = profile.root * 4;
    lfo.start(now);
    output.connect(ctx.destination);

    bgmRef.current = {
      stop: () => {
        const end = ctx.currentTime + 0.35;
        output.gain.cancelScheduledValues(ctx.currentTime);
        output.gain.setValueAtTime(output.gain.value, ctx.currentTime);
        output.gain.linearRampToValueAtTime(0.0001, end);
        root.stop(end);
        fifth.stop(end);
        air.stop(end);
        lfo.stop(end);
      },
    };
  }, [getContext]);

  useEffect(() => {
    const interactiveSelector =
      "button, a, input[type='checkbox'], input[type='range'], .colorPreset, .languageItem";

    const handlePointerDown = async (event: PointerEvent) => {
      await unlock();
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        !target.closest("[data-sfx-preview]") &&
        target.closest(interactiveSelector)
      ) {
        playSfx();
      }
      startBgm();
    };

    const handleKeyDown = async (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      await unlock();
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        !target.closest("[data-sfx-preview]") &&
        target.closest(interactiveSelector)
      ) {
        playSfx();
      }
      startBgm();
    };

    const handlePreview = async () => {
      await unlock();
      playSfx();
      startBgm();
    };

    window.addEventListener("pointerdown", handlePointerDown, { capture: true });
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("hanazar:sfx-preview", handlePreview);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown, { capture: true });
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("hanazar:sfx-preview", handlePreview);
    };
  }, [playSfx, startBgm, unlock]);

  useEffect(() => {
    if (!settings.bgmEnabled || settings.masterVolume <= 0 || settings.bgmVolume <= 0) {
      stopBgm();
      return;
    }
    if (unlockedRef.current) {
      stopBgm();
      startBgm();
    }
  }, [settings.bgmEnabled, settings.bgmStyle, settings.masterVolume, settings.bgmVolume, startBgm, stopBgm]);

  useEffect(() => {
    return () => {
      stopBgm();
      audioRef.current?.close();
    };
  }, [stopBgm]);

  return null;
}
