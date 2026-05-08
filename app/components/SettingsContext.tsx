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
  sfxStyle: "classic",
  bgmEnabled: false,
  bgmVolume: 30,
  bgmStyle: "ambient",
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
        setSettings((prev) => ({ ...prev, ...parsed }));
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
      setSettings((prev) => ({ ...prev, ...parsed }));
      return true;
    } catch {
      return false;
    }
  }, []);

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
