"use client";

import { useCallback, useEffect, useRef } from "react";
import { useSettingsContext, type SettingsState } from "./SettingsContext";

type SfxKind = "click" | "navigate" | "toggle" | "close";
export type BgmPlaybackState = "off" | "muted" | "waiting" | "playing" | "paused" | "unavailable";

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

const sfxKinds: Record<SfxKind, { pitch: number; direction?: "up"; volume: number }> = {
  click: { pitch: 1, volume: 1 },
  navigate: { pitch: 1.14, direction: "up", volume: 0.92 },
  toggle: { pitch: 0.86, direction: "up", volume: 0.82 },
  close: { pitch: 0.7, volume: 0.76 },
};

const SFX_THROTTLE_MS = 72;

interface AmbientNodes {
  bus: GainNode;
  filter: BiquadFilterNode;
  oscillators: OscillatorNode[];
  lfo: OscillatorNode;
  lfoDepth: GainNode;
  chordTimer: number;
}

function resolveStyleName(style: string, options: string[]) {
  return options.find((option) => option.toLowerCase() === style.toLowerCase()) ?? style;
}

function getSfxProfile(style: string) {
  const resolved = resolveStyleName(style, Object.keys(sfxProfiles));
  return sfxProfiles[resolved] ?? sfxProfiles.Classic;
}

function ambientVolume(settings: SettingsState) {
  return Math.min(0.035, (settings.masterVolume / 100) * (settings.bgmVolume / 100) * 0.035);
}

function getSfxKind(target: Element): SfxKind {
  if (target.closest("a")) return "navigate";
  if (target.closest(".settingsCloseBtn, .danger")) return "close";
  if (target.closest("input[type='checkbox'], .settingsTabBtn, .seg-btn, .colorPreset, .languageItem")) {
    return "toggle";
  }
  return "click";
}

export default function AudioEngine() {
  const { settings } = useSettingsContext();
  const audioRef = useRef<AudioContext | null>(null);
  const ambientRef = useRef<AmbientNodes | null>(null);
  const settingsRef = useRef(settings);
  const lastSfxTimeRef = useRef(0);

  const publishBgmState = useCallback((state: BgmPlaybackState) => {
    window.dispatchEvent(new CustomEvent("hanazar:bgm-state", { detail: { state } }));
  }, []);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const getContext = useCallback(() => {
    if (typeof window === "undefined") return null;
    const audioWindow = window as Window &
      typeof globalThis & { webkitAudioContext?: typeof AudioContext };
    const AudioContextClass = audioWindow.AudioContext || audioWindow.webkitAudioContext;
    if (!AudioContextClass) {
      publishBgmState("unavailable");
      return null;
    }
    if (!audioRef.current) {
      try {
        audioRef.current = new AudioContextClass();
      } catch {
        publishBgmState("unavailable");
        return null;
      }
    }
    return audioRef.current;
  }, [publishBgmState]);

  const stopAmbient = useCallback(() => {
    const current = ambientRef.current;
    if (!current) return;
    ambientRef.current = null;
    window.clearInterval(current.chordTimer);

    const ctx = audioRef.current;
    const now = ctx?.currentTime ?? 0;
    current.bus.gain.cancelScheduledValues(now);
    current.bus.gain.setTargetAtTime(0.0001, now, 0.12);

    window.setTimeout(() => {
      [...current.oscillators, current.lfo].forEach((oscillator) => {
        try {
          oscillator.stop();
        } catch {
          // The node may already be stopped during teardown.
        }
      });
      current.bus.disconnect();
      current.filter.disconnect();
      current.lfoDepth.disconnect();
    }, 450);
  }, []);

  const syncAmbient = useCallback(() => {
    const ctx = audioRef.current;
    const currentSettings = settingsRef.current;

    if (!currentSettings.bgmEnabled) {
      stopAmbient();
      publishBgmState("off");
      return;
    }
    if (currentSettings.masterVolume <= 0 || currentSettings.bgmVolume <= 0) {
      stopAmbient();
      publishBgmState("muted");
      return;
    }
    if (document.visibilityState !== "visible") {
      stopAmbient();
      publishBgmState("paused");
      return;
    }
    const audioWindow = window as Window &
      typeof globalThis & { webkitAudioContext?: typeof AudioContext };
    if (!audioWindow.AudioContext && !audioWindow.webkitAudioContext) {
      stopAmbient();
      publishBgmState("unavailable");
      return;
    }
    if (!ctx || ctx.state !== "running") {
      stopAmbient();
      publishBgmState("waiting");
      return;
    }

    const volume = ambientVolume(currentSettings);
    if (ambientRef.current) {
      ambientRef.current.bus.gain.setTargetAtTime(volume, ctx.currentTime, 0.2);
      publishBgmState("playing");
      return;
    }

    const bus = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const lfo = ctx.createOscillator();
    const lfoDepth = ctx.createGain();
    const ratios = [1, 1.5, 2];
    const roots = [110, 130.81, 98, 146.83];
    let chordIndex = 0;

    bus.gain.setValueAtTime(0.0001, ctx.currentTime);
    bus.gain.setTargetAtTime(volume, ctx.currentTime, 0.28);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(760, ctx.currentTime);
    filter.Q.setValueAtTime(0.7, ctx.currentTime);

    lfo.type = "sine";
    lfo.frequency.setValueAtTime(0.055, ctx.currentTime);
    lfoDepth.gain.setValueAtTime(120, ctx.currentTime);
    lfo.connect(lfoDepth);
    lfoDepth.connect(filter.frequency);

    const oscillators = ratios.map((ratio, index) => {
      const oscillator = ctx.createOscillator();
      const voiceGain = ctx.createGain();
      oscillator.type = index === 1 ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(roots[0] * ratio, ctx.currentTime);
      oscillator.detune.setValueAtTime(index === 0 ? -4 : index === 2 ? 4 : 0, ctx.currentTime);
      voiceGain.gain.setValueAtTime([0.5, 0.22, 0.12][index], ctx.currentTime);
      oscillator.connect(voiceGain);
      voiceGain.connect(bus);
      oscillator.start();
      return oscillator;
    });

    const scheduleChord = () => {
      chordIndex = (chordIndex + 1) % roots.length;
      const now = ctx.currentTime;
      oscillators.forEach((oscillator, index) => {
        oscillator.frequency.setTargetAtTime(roots[chordIndex] * ratios[index], now, 1.8);
      });
    };

    bus.connect(filter);
    filter.connect(ctx.destination);
    lfo.start();

    ambientRef.current = {
      bus,
      filter,
      oscillators,
      lfo,
      lfoDepth,
      chordTimer: window.setInterval(scheduleChord, 8000),
    };
    publishBgmState("playing");
  }, [publishBgmState, stopAmbient]);

  const unlock = useCallback(async () => {
    const ctx = getContext();
    if (!ctx) return;
    try {
      if (ctx.state === "suspended") await ctx.resume();
    } catch {
      publishBgmState("waiting");
      return;
    }
    syncAmbient();
  }, [getContext, publishBgmState, syncAmbient]);

  const playSfx = useCallback((kind: SfxKind = "click") => {
    const current = settingsRef.current;
    if (!current.sfxEnabled || current.masterVolume <= 0 || current.sfxVolume <= 0) return;

    const nowMs = performance.now();
    if (nowMs - lastSfxTimeRef.current < SFX_THROTTLE_MS) return;
    lastSfxTimeRef.current = nowMs;

    const ctx = getContext();
    if (!ctx || ctx.state !== "running") return;

    const profile = getSfxProfile(current.sfxStyle);
    const signature = sfxKinds[kind];
    const start = profile.start * signature.pitch;
    const end = profile.end * signature.pitch;
    const now = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const volume = Math.min(
      0.14,
      (current.masterVolume / 100) * (current.sfxVolume / 100) * 0.18 * signature.volume
    );

    oscillator.type = profile.wave;
    oscillator.frequency.setValueAtTime(signature.direction === "up" ? Math.min(start, end) : start, now);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(40, signature.direction === "up" ? Math.max(start, end) : end),
      now + profile.duration
    );
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + profile.duration);

    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(now);
    oscillator.stop(now + profile.duration + 0.02);
  }, [getContext]);

  useEffect(() => {
    syncAmbient();
  }, [settings.bgmEnabled, settings.bgmVolume, settings.masterVolume, syncAmbient]);

  useEffect(() => {
    const interactiveSelector =
      "button, a, input[type='checkbox'], .colorPreset, .languageItem";

    const handlePointerDown = async (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const current = settingsRef.current;
      const wantsSfx = current.sfxEnabled && current.masterVolume > 0 && current.sfxVolume > 0;
      const wantsBgm = current.bgmEnabled && current.masterVolume > 0 && current.bgmVolume > 0;
      const isAudioControl = Boolean(target.closest("[data-audio-unlock], [data-sfx-preview]"));
      if (!wantsSfx && !wantsBgm && !isAudioControl) return;
      await unlock();
      if (
        !target.closest("[data-sfx-preview]") &&
        target.closest(interactiveSelector)
      ) {
        playSfx(getSfxKind(target));
      }
    };

    const handleKeyDown = async (event: KeyboardEvent) => {
      const modifier = event.ctrlKey || event.metaKey;
      if (modifier && !event.shiftKey && event.key.toLowerCase() === "m") {
        const current = settingsRef.current;
        if (current.bgmEnabled || current.sfxEnabled) await unlock();
        return;
      }
      if ((event.key !== "Enter" && event.key !== " ") || event.repeat) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const current = settingsRef.current;
      const wantsSfx = current.sfxEnabled && current.masterVolume > 0 && current.sfxVolume > 0;
      const wantsBgm = current.bgmEnabled && current.masterVolume > 0 && current.bgmVolume > 0;
      const isAudioControl = Boolean(target.closest("[data-audio-unlock], [data-sfx-preview]"));
      if (!wantsSfx && !wantsBgm && !isAudioControl) return;
      await unlock();
      if (
        !target.closest("[data-sfx-preview]") &&
        target.closest(interactiveSelector)
      ) {
        playSfx(getSfxKind(target));
      }
    };

    const handlePreview = async () => {
      await unlock();
      playSfx("navigate");
    };

    const handleVisibility = () => syncAmbient();
    const handleStateRequest = () => syncAmbient();

    window.addEventListener("pointerdown", handlePointerDown, { capture: true });
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("hanazar:sfx-preview", handlePreview);
    window.addEventListener("hanazar:bgm-state-request", handleStateRequest);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown, { capture: true });
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("hanazar:sfx-preview", handlePreview);
      window.removeEventListener("hanazar:bgm-state-request", handleStateRequest);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [playSfx, syncAmbient, unlock]);

  useEffect(() => {
    return () => {
      stopAmbient();
      audioRef.current?.close();
    };
  }, [stopAmbient]);

  return null;
}
