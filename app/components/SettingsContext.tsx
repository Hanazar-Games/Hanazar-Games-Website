"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface SettingsState {
  // Style
  theme: "dark" | "light" | "auto";
  font: "sans" | "serif" | "mono" | "rounded" | "custom";
  customFont: string;
  colorPreset: string;
  contrast: number;
  // Language
  language: string;
  // Audio
  masterVolume: number;
  sfxEnabled: boolean;
  sfxVolume: number;
  sfxStyle: string;
  bgmEnabled: boolean;
  bgmVolume: number;
  bgmStyle: string;
  // Animation
  animationsEnabled: boolean;
  animSpeed: number;
  animUiFade: boolean;
  animButtonHover: boolean;
  animModal: boolean;
  // Performance
  reduceAnimations: boolean;
  disableBlur: boolean;
  lowResPreview: boolean;
  lazyLoad: boolean;
  disableParticles: boolean;
  aggressiveCache: boolean;
  devMode: boolean;
  maxConcurrent: number;
  // API
  apiBaseUrl: string;
  apiTimeout: number;
  apiRetries: number;
}

const defaultSettings: SettingsState = {
  theme: "dark",
  font: "sans",
  customFont: "",
  colorPreset: "graphite",
  contrast: 100,
  language: "en",
  masterVolume: 80,
  sfxEnabled: true,
  sfxVolume: 70,
  sfxStyle: "Classic",
  bgmEnabled: false,
  bgmVolume: 30,
  bgmStyle: "Ambient",
  animationsEnabled: true,
  animSpeed: 100,
  animUiFade: true,
  animButtonHover: true,
  animModal: true,
  reduceAnimations: false,
  disableBlur: false,
  lowResPreview: false,
  lazyLoad: false,
  disableParticles: false,
  aggressiveCache: false,
  devMode: false,
  maxConcurrent: 4,
  apiBaseUrl: "",
  apiTimeout: 30000,
  apiRetries: 3,
};

const STORAGE_KEY = "hanazar-settings-v1";

const optionSets = {
  theme: ["dark", "light", "auto"],
  font: ["sans", "serif", "mono", "rounded", "custom"],
  colorPreset: ["graphite", "ocean", "emerald", "amber", "rose", "lavender"],
  language: [
    "zh-CN", "zh-TW", "en", "ja", "ko", "fr", "de", "es", "ru", "pt",
    "it", "nl", "pl", "tr", "vi", "id", "uk", "el", "cs", "sv",
  ],
} as const;

const booleanKeys = [
  "sfxEnabled",
  "bgmEnabled",
  "animationsEnabled",
  "animUiFade",
  "animButtonHover",
  "animModal",
  "reduceAnimations",
  "disableBlur",
  "lowResPreview",
  "lazyLoad",
  "disableParticles",
  "aggressiveCache",
  "devMode",
] as const;

const numberRanges = {
  contrast: [80, 130],
  masterVolume: [0, 100],
  sfxVolume: [0, 100],
  bgmVolume: [0, 100],
  animSpeed: [50, 150],
  maxConcurrent: [1, 10],
  apiTimeout: [5000, 60000],
  apiRetries: [0, 10],
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOneOf<T extends readonly string[]>(value: unknown, options: T): value is T[number] {
  return typeof value === "string" && options.includes(value);
}

function clampNumber(value: unknown, min: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function normalizeSettings(input: unknown, base: SettingsState = defaultSettings) {
  if (!isRecord(input)) return null;

  const next: SettingsState = { ...base };

  if (isOneOf(input.theme, optionSets.theme)) next.theme = input.theme;
  if (isOneOf(input.font, optionSets.font)) next.font = input.font;
  if (isOneOf(input.colorPreset, optionSets.colorPreset)) next.colorPreset = input.colorPreset;
  if (isOneOf(input.language, optionSets.language)) next.language = input.language;

  if (typeof input.customFont === "string") next.customFont = input.customFont.slice(0, 120);
  if (typeof input.sfxStyle === "string") next.sfxStyle = input.sfxStyle.slice(0, 80);
  if (typeof input.bgmStyle === "string") next.bgmStyle = input.bgmStyle.slice(0, 80);
  if (typeof input.apiBaseUrl === "string") next.apiBaseUrl = input.apiBaseUrl.slice(0, 500);

  for (const key of booleanKeys) {
    if (typeof input[key] === "boolean") next[key] = input[key];
  }

  for (const key of Object.keys(numberRanges) as Array<keyof typeof numberRanges>) {
    const [min, max] = numberRanges[key];
    const normalized = clampNumber(input[key], min, max);
    if (normalized !== null) next[key] = normalized as never;
  }

  return next;
}

interface SettingsContextValue {
  settings: SettingsState;
  update: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  reset: () => void;
  exportJson: () => string;
  importJson: (json: string) => boolean;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const normalized = normalizeSettings(parsed, defaultSettings);
        if (normalized) setSettings(normalized);
      }
    } catch {
      // ignore parse errors
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings, loaded]);

  const update = useCallback(<K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const reset = useCallback(() => {
    setSettings(defaultSettings);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const exportJson = useCallback(() => JSON.stringify(settings, null, 2), [settings]);

  const importJson = useCallback((json: string) => {
    try {
      const parsed = JSON.parse(json);
      const normalized = normalizeSettings(parsed, settings);
      if (!normalized) return false;
      setSettings(normalized);
      return true;
    } catch {
      return false;
    }
  }, [settings]);

  return (
    <SettingsContext.Provider value={{ settings, update, reset, exportJson, importJson }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettingsContext() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettingsContext must be used within SettingsProvider");
  return ctx;
}
