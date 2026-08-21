"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { useTranslation } from "../hooks/useTranslation";
import StyleTab from "./settings/StyleTab";
import LanguageTab from "./settings/LanguageTab";
import AudioTab from "./settings/AudioTab";
import AnimationTab from "./settings/AnimationTab";
import PerformanceTab from "./settings/PerformanceTab";

import ShortcutsTab from "./settings/ShortcutsTab";
import OtherTab from "./settings/OtherTab";
import AnnouncementTab from "./settings/AnnouncementTab";
import AboutTab from "./settings/AboutTab";
import { useSettingsContext } from "./SettingsContext";
import { skinServiceLanguages } from "../lib/skinServiceI18n";

const tabs = [
  { key: "style", label: "tabStyle", icon: "S" },
  { key: "language", label: "tabLanguage", icon: "L" },
  { key: "audio", label: "tabAudio", icon: "A" },
  { key: "animation", label: "tabAnimation", icon: "N" },
  { key: "performance", label: "tabPerformance", icon: "P" },
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
  const pathname = usePathname();
  const isSkinService = pathname.includes("/skin-service");
  const [activeTab, setActiveTab] = useState("style");
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const previousOverflowRef = useRef("");
  const previousPaddingRightRef = useRef("");
  const previousMainAriaHiddenRef = useRef<string | null>(null);
  const previousMainInertRef = useRef(false);
  const { tr } = useTranslation();
  const { settings } = useSettingsContext();
  const modalTransitionMs = (
    !settings.animationsEnabled || settings.reduceAnimations || !settings.animModal
  ) ? 0 : Math.round(280 * (100 / settings.animSpeed));

  useEffect(() => {
    if (open) {
      setVisible(true);
      requestAnimationFrame(() => setAnimating(true));
    } else {
      setAnimating(false);
      if (modalTransitionMs === 0) {
        setVisible(false);
        return;
      }
      const timer = setTimeout(() => setVisible(false), modalTransitionMs);
      return () => clearTimeout(timer);
    }
  }, [modalTransitionMs, open]);

  useEffect(() => {
    if (panelRef.current) {
      panelRef.current.scrollTop = 0;
    }
  }, [activeTab]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key !== "Tab" || !modalRef.current) return;

      const focusable = Array.from(
        modalRef.current.querySelectorAll<HTMLElement>(
          "a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1']):not([disabled])"
        )
      ).filter((element) => element.offsetParent !== null && element.tabIndex >= 0);

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (!modalRef.current.contains(active)) {
        e.preventDefault();
        first.focus();
        return;
      }

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
        return;
      }

      if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
      previousOverflowRef.current = document.body.style.overflow;
      previousPaddingRightRef.current = document.body.style.paddingRight;
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      if (scrollbarWidth > 0) {
        const currentPadding = Number.parseFloat(getComputedStyle(document.body).paddingRight) || 0;
        document.body.style.paddingRight = `${currentPadding + scrollbarWidth}px`;
      }
      const main = document.querySelector<HTMLElement>("main");
      if (main) {
        previousMainAriaHiddenRef.current = main.getAttribute("aria-hidden");
        previousMainInertRef.current = main.hasAttribute("inert");
        main.setAttribute("aria-hidden", "true");
        main.setAttribute("inert", "");
      }
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflowRef.current;
      document.body.style.paddingRight = previousPaddingRightRef.current;
      const main = document.querySelector<HTMLElement>("main");
      if (main) {
        if (previousMainAriaHiddenRef.current === null) main.removeAttribute("aria-hidden");
        else main.setAttribute("aria-hidden", previousMainAriaHiddenRef.current);
        if (!previousMainInertRef.current) main.removeAttribute("inert");
      }
      previousFocusRef.current?.focus({ preventScroll: true });
    };
  }, [open, handleKeyDown]);

  useEffect(() => {
    if (!open || !visible) return;
    const frame = requestAnimationFrame(() => {
      closeButtonRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [open, visible]);

  const renderTab = () => {
    switch (activeTab) {
      case "style": return <StyleTab />;
      case "language": return isSkinService
        ? <LanguageTab allowedCodes={skinServiceLanguages} />
        : <LanguageTab />;
      case "audio": return <AudioTab />;
      case "animation": return <AnimationTab />;
      case "performance": return <PerformanceTab />;
      case "shortcuts": return <ShortcutsTab />;
      case "other": return <OtherTab />;
      case "announcement": return <AnnouncementTab />;
      case "about": return <AboutTab />;
      default: return <StyleTab />;
    }
  };

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const keyOffsets: Record<string, number> = {
      ArrowRight: 1,
      ArrowDown: 1,
      ArrowLeft: -1,
      ArrowUp: -1,
    };
    let nextIndex: number | null = null;

    if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = tabs.length - 1;
    else if (event.key in keyOffsets) {
      nextIndex = (index + keyOffsets[event.key] + tabs.length) % tabs.length;
    }

    if (nextIndex === null) return;
    event.preventDefault();
    const nextTab = tabs[nextIndex];
    setActiveTab(nextTab.key);
    const tab = document.getElementById(`settings-tab-${nextTab.key}`);
    tab?.focus();
    tab?.scrollIntoView({ block: "nearest", inline: "nearest" });
  };

  if (!visible) return null;

  return (
    <div className={`settingsOverlay${animating ? " active" : ""}`} onClick={onClose}>
      <div
        id="project-settings-dialog"
        className={`settingsModal${animating ? " active" : ""}`}
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        role={open ? "dialog" : undefined}
        aria-modal={open ? "true" : undefined}
        aria-hidden={open ? undefined : true}
        aria-labelledby="settings-title"
        inert={!open}
      >
        <div className="settingsModalHeader">
          <h2 id="settings-title">{tr("settingsTitle")}</h2>
          <button
            className="settingsCloseBtn"
            type="button"
            ref={closeButtonRef}
            onClick={onClose}
            aria-label={tr("ariaCloseSettings")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="settingsModalBody">
          <nav
            className="settingsTabNav"
            aria-label={tr("ariaSettingsCategories")}
            role="tablist"
          >
            {tabs.map((tab, index) => (
              <button
                key={tab.key}
                id={`settings-tab-${tab.key}`}
                type="button"
                role="tab"
                className={`settingsTabBtn${activeTab === tab.key ? " active" : ""}`}
                onClick={() => setActiveTab(tab.key)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
                aria-selected={activeTab === tab.key}
                aria-controls="settings-tab-panel"
                tabIndex={activeTab === tab.key ? 0 : -1}
              >
                <span className="settingsTabIcon">{tab.icon}</span>
                <span className="settingsTabLabel">{tr(tab.label)}</span>
              </button>
            ))}
          </nav>

          <div
            className="settingsTabPanel"
            id="settings-tab-panel"
            ref={panelRef}
            role="tabpanel"
            aria-labelledby={`settings-tab-${activeTab}`}
          >
            {renderTab()}
          </div>
        </div>
      </div>
    </div>
  );
}
