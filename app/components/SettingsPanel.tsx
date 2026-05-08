"use client";

import { useState, useEffect, useCallback } from "react";
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
  { key: "style", label: "Style", icon: "S" },
  { key: "language", label: "Language", icon: "L" },
  { key: "audio", label: "Audio", icon: "A" },
  { key: "animation", label: "Animation", icon: "N" },
  { key: "performance", label: "Performance", icon: "P" },
  { key: "api", label: "API", icon: "I" },
  { key: "shortcuts", label: "Shortcuts", icon: "K" },
  { key: "other", label: "Other", icon: "O" },
  { key: "announcement", label: "Announce", icon: "B" },
  { key: "about", label: "About", icon: "?" },
];

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

export default function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState("style");
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);

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
        aria-label="Settings"
      >
        <div className="settingsModalHeader">
          <h2>Project Settings</h2>
          <button className="settingsCloseBtn" onClick={onClose} aria-label="Close settings">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="settingsModalBody">
          <nav className="settingsTabNav" aria-label="Settings categories">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                className={`settingsTabBtn${activeTab === tab.key ? " active" : ""}`}
                onClick={() => setActiveTab(tab.key)}
                aria-pressed={activeTab === tab.key}
              >
                <span className="settingsTabIcon">{tab.icon}</span>
                <span className="settingsTabLabel">{tab.label}</span>
              </button>
            ))}
          </nav>

          <div className="settingsTabPanel" key={activeTab}>
            {renderTab()}
          </div>
        </div>
      </div>
    </div>
  );
}
