"use client";

import { useCallback, useEffect, useRef } from "react";
import { useSettingsContext } from "./SettingsContext";

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

const SFX_THROTTLE_MS = 80;

function resolveStyleName(style: string, options: string[]) {
  return options.find((option) => option.toLowerCase() === style.toLowerCase()) ?? style;
}

function getSfxProfile(style: string) {
  const resolved = resolveStyleName(style, Object.keys(sfxProfiles));
  return sfxProfiles[resolved] ?? sfxProfiles.Classic;
}

export default function AudioEngine() {
  const { settings } = useSettingsContext();
  const audioRef = useRef<AudioContext | null>(null);
  const unlockedRef = useRef(false);
  const settingsRef = useRef(settings);
  const lastSfxTimeRef = useRef(0);

  const publishAudioState = useCallback(() => {
    window.dispatchEvent(new CustomEvent("hanazar:audio-state", {
      detail: {
        unlocked: unlockedRef.current,
        bgmActive: false,
      },
    }));
  }, []);

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
    publishAudioState();
  }, [getContext, publishAudioState]);

  const playSfx = useCallback(() => {
    const current = settingsRef.current;
    if (!current.sfxEnabled || current.masterVolume <= 0 || current.sfxVolume <= 0) return;

    const nowMs = performance.now();
    if (nowMs - lastSfxTimeRef.current < SFX_THROTTLE_MS) return;
    lastSfxTimeRef.current = nowMs;

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

  useEffect(() => {
    const interactiveSelector =
      "button, a, input[type='checkbox'], .colorPreset, .languageItem";

    const handlePointerDown = async (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        !target.closest("[data-sfx-preview]") &&
        target.closest(interactiveSelector)
      ) {
        await unlock();
        playSfx();
      } else {
        await unlock();
      }
    };

    const handleKeyDown = async (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        !target.closest("[data-sfx-preview]") &&
        target.closest(interactiveSelector)
      ) {
        await unlock();
        playSfx();
      } else {
        await unlock();
      }
    };

    const handlePreview = async () => {
      await unlock();
      playSfx();
    };

    window.addEventListener("pointerdown", handlePointerDown, { capture: true });
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("hanazar:sfx-preview", handlePreview);
    window.addEventListener("hanazar:audio-state-request", publishAudioState);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown, { capture: true });
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("hanazar:sfx-preview", handlePreview);
      window.removeEventListener("hanazar:audio-state-request", publishAudioState);
    };
  }, [playSfx, publishAudioState, unlock]);

  useEffect(() => {
    return () => {
      audioRef.current?.close();
    };
  }, []);

  return null;
}
