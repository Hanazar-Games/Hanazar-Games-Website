"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "../hooks/useTranslation";
import StyleTab from "./settings/StyleTab";
import LanguageTab from "./settings/LanguageTab";
import AudioTab from "./settings/AudioTab";
import AnimationTab from "./settings/AnimationTab";
import PerformanceTab from "./settings/PerformanceTab";
import ApiTab from "./settings/ApiTab";
import ShortcutsTab from "./settings/ShortcutsTab";
import OtherTab from "./settings/OtherTab";
import AnnouncementTab from "./settings/AnnouncementTab";
import AboutTab from "./settings/AboutTab";

const tabs = [
  { key: "style", label: "tabStyle", icon: "S" },
  { key: "language", label: "tabLanguage", icon: "L" },
  { key: "audio", label: "tabAudio", icon: "A" },
  { key: "animation", label: "tabAnimation", icon: "N" },
  { key: "performance", label: "tabPerformance", icon: "P" },
  { key: "api", label: "tabApi", icon: "I" },
  { key: "shortcuts", label: "tabShortcuts", icon: "K" },
  { key: "other", label: "tabOther", icon: "O" },
  { key: "announcement", label: "tabAnnouncement", icon: "B" },
  { key: "about", label: "tabAbout", icon: "?" },
];

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

export default function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState("style");
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { tr } = useTranslation();

  useEffect(() => {
    if (open) {
      setVisible(true);
      requestAnimationFrame(() => setAnimating(true));
    } else {
      setAnimating(false);
      const timer = setTimeout(() => setVisible(false), 350);
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    if (panelRef.current) {
      panelRef.current.scrollTop = 0;
    }
  }, [activeTab]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  const renderTab = () => {
    switch (activeTab) {
      case "style": return <StyleTab />;
      case "language": return <LanguageTab />;
      case "audio": return <AudioTab />;
      case "animation": return <AnimationTab />;
      case "performance": return <PerformanceTab />;
      case "api": return <ApiTab />;
      case "shortcuts": return <ShortcutsTab />;
      case "other": return <OtherTab />;
      case "announcement": return <AnnouncementTab />;
      case "about": return <AboutTab />;
      default: return <StyleTab />;
    }
  };

  if (!visible) return null;

  return (
    <div className={`settingsOverlay${animating ? " active" : ""}`} onClick={onClose}>
      <div
        className={`settingsModal${animating ? " active" : ""}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={tr("ariaSettings")}
      >
        <div className="settingsModalHeader">
          <h2>{tr("settingsTitle")}</h2>
          <button className="settingsCloseBtn" onClick={onClose} aria-label={tr("ariaCloseSettings")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="settingsModalBody">
          <nav className="settingsTabNav" aria-label={tr("ariaSettingsCategories")}>
            {tabs.map((tab) => (
              <button
                key={tab.key}
                className={`settingsTabBtn${activeTab === tab.key ? " active" : ""}`}
                onClick={() => setActiveTab(tab.key)}
                aria-pressed={activeTab === tab.key}
              >
                <span className="settingsTabIcon">{tab.icon}</span>
                <span className="settingsTabLabel">{tr(tab.label)}</span>
              </button>
            ))}
          </nav>

          <div className="settingsTabPanel" ref={panelRef}>
            {renderTab()}
          </div>
        </div>
      </div>
    </div>
  );
}
