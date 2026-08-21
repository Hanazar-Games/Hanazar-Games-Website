"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";

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
  // Animation
  animationsEnabled: boolean;
  animSpeed: number;
  animUiFade: boolean;
  animButtonHover: boolean;
  animModal: boolean;
  // Performance
  reduceAnimations: boolean;
  disableBlur: boolean;
  disableDecorations: boolean;
}

export const sfxStyles = [
  "Classic", "Electronic", "Retro", "Wood", "Bell", "Space",
  "Drum", "Piano", "Synth", "Chiptune", "Pluck", "Crystal",
] as const;

const sharedDefaults = {
  font: "sans",
  customFont: "",
  colorPreset: "graphite",
  contrast: 100,
  masterVolume: 75,
  sfxEnabled: true,
  sfxVolume: 28,
  sfxStyle: "Classic",
  bgmEnabled: false,
  bgmVolume: 12,
  animationsEnabled: true,
  animSpeed: 100,
  animUiFade: true,
  animButtonHover: true,
  animModal: true,
  reduceAnimations: false,
  disableBlur: false,
  disableDecorations: false,
} satisfies Omit<SettingsState, "theme" | "language">;

const mainDefaultSettings: SettingsState = {
  ...sharedDefaults,
  theme: "dark",
  language: "en",
};

const skinServiceDefaultSettings: SettingsState = {
  ...sharedDefaults,
  theme: "light",
  language: "zh-CN",
};

const MAIN_STORAGE_KEY = "hanazar-settings-v1";
const SKIN_SERVICE_STORAGE_KEY = "hanazar-skin-service-settings-v1";

const optionSets = {
  theme: ["dark", "light", "auto"],
  font: ["sans", "serif", "mono", "rounded", "custom"],
  colorPreset: ["graphite", "ocean", "emerald", "amber", "rose", "lavender"],
  language: [
    "zh-CN", "zh-TW", "en", "ja", "ko", "fr", "de", "es", "ru", "pt",
    "it", "nl", "pl", "tr", "vi", "id", "uk", "el", "cs", "sv",
  ],
  sfxStyle: sfxStyles,
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
  "disableDecorations",
] as const;

const numberRanges = {
  contrast: [80, 130],
  masterVolume: [0, 100],
  sfxVolume: [0, 100],
  bgmVolume: [0, 100],
  animSpeed: [50, 150],
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

function normalizeSettings(input: unknown, base: SettingsState) {
  if (!isRecord(input)) return null;

  const next: SettingsState = { ...base };

  if (isOneOf(input.theme, optionSets.theme)) next.theme = input.theme;
  if (isOneOf(input.font, optionSets.font)) next.font = input.font;
  if (isOneOf(input.colorPreset, optionSets.colorPreset)) next.colorPreset = input.colorPreset;
  if (isOneOf(input.language, optionSets.language)) next.language = input.language;

  if (typeof input.customFont === "string") next.customFont = input.customFont.slice(0, 120);
  if (isOneOf(input.sfxStyle, optionSets.sfxStyle)) next.sfxStyle = input.sfxStyle;

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
  loaded: boolean;
  update: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  reset: () => void;
  clearCache: () => void;
  exportJson: () => string;
  importJson: (json: string) => boolean;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isSkinService = pathname.startsWith("/skin-service");
  const [mainSettings, setMainSettings] = useState<SettingsState>(mainDefaultSettings);
  const [skinServiceSettings, setSkinServiceSettings] = useState<SettingsState>(skinServiceDefaultSettings);
  const [loaded, setLoaded] = useState(false);
  const settings = isSkinService ? skinServiceSettings : mainSettings;
  const defaultSettings = isSkinService ? skinServiceDefaultSettings : mainDefaultSettings;
  const storageKey = isSkinService ? SKIN_SERVICE_STORAGE_KEY : MAIN_STORAGE_KEY;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(MAIN_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const normalized = normalizeSettings(parsed, mainDefaultSettings);
        if (normalized) setMainSettings(normalized);
      }
    } catch {
      // ignore parse errors
    }
    try {
      const raw = localStorage.getItem(SKIN_SERVICE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const normalized = normalizeSettings(parsed, skinServiceDefaultSettings);
        if (normalized) {
          if (normalized.theme === "auto") normalized.theme = "light";
          if (!["zh-CN", "en", "ja"].includes(normalized.language)) normalized.language = "zh-CN";
          setSkinServiceSettings(normalized);
        }
      }
    } catch {
      // ignore parse errors
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(MAIN_STORAGE_KEY, JSON.stringify(mainSettings));
    } catch {
      // Keep in-memory settings working when storage is unavailable.
    }
  }, [mainSettings, loaded]);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(SKIN_SERVICE_STORAGE_KEY, JSON.stringify(skinServiceSettings));
    } catch {
      // Keep in-memory settings working when storage is unavailable.
    }
  }, [skinServiceSettings, loaded]);

  const update = useCallback(<K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    const setSettings = isSkinService ? setSkinServiceSettings : setMainSettings;
    setSettings((previous) => ({ ...previous, [key]: value }));
  }, [isSkinService]);

  const reset = useCallback(() => {
    const setSettings = isSkinService ? setSkinServiceSettings : setMainSettings;
    setSettings(defaultSettings);
    try {
      localStorage.setItem(storageKey, JSON.stringify(defaultSettings));
    } catch {
      // ignore storage errors
    }
  }, [defaultSettings, isSkinService, storageKey]);

  const clearCache = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Keep the current in-memory settings when storage is unavailable.
    }
  }, [storageKey]);

  const exportJson = useCallback(() => JSON.stringify(settings, null, 2), [settings]);

  const importJson = useCallback((json: string) => {
    try {
      const parsed = JSON.parse(json);
      const normalized = normalizeSettings(parsed, settings);
      if (!normalized) return false;
      const setSettings = isSkinService ? setSkinServiceSettings : setMainSettings;
      setSettings(normalized);
      return true;
    } catch {
      return false;
    }
  }, [isSkinService, settings]);

  return (
    <SettingsContext.Provider value={{ settings, loaded, update, reset, clearCache, exportJson, importJson }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettingsContext() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettingsContext must be used within SettingsProvider");
  return ctx;
}
