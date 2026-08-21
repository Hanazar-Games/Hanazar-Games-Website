"use client";

import { useSyncExternalStore } from "react";
import { skinServiceLanguage, type SkinServiceLanguage } from "../lib/skinServiceI18n";

const STORAGE_KEY = "hanazar.skin-service-language.v1";
const CHANGE_EVENT = "hanazar:skin-service-language";
let memoryLanguage: SkinServiceLanguage = "zh-CN";

function snapshot(): SkinServiceLanguage {
  try {
    memoryLanguage = skinServiceLanguage(localStorage.getItem(STORAGE_KEY) ?? memoryLanguage);
  } catch {
    // Use the current session value when storage is unavailable.
  }
  return memoryLanguage;
}

function subscribe(onChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) onChange();
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", handleStorage);
  };
}

export function useSkinServiceLanguage() {
  return useSyncExternalStore(subscribe, snapshot, (): SkinServiceLanguage => "zh-CN");
}

export function setSkinServiceLanguage(language: SkinServiceLanguage) {
  memoryLanguage = language;
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // The current page can still use the selected language.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
