"use client";

import { useTranslation } from "../../hooks/useTranslation";

const changelog = [
  {
    version: "2.5.0",
    date: "2026-07-27",
    title: "Games Hub Expansion and GitHub Pages Deployment",
    items: [
      "Added Guandan and Liar's Bar to the Games Hub with real in-game cover art.",
      "Added a curated Games Hub to the homepage and a new Other Products section featuring LC300A Luochuan OS.",
      "Added a GitHub Pages workflow, static export support, project base paths, and deployment-safe asset URLs.",
      "Reduced SFX loudness and repetition while calming scroll, hover, blur, and card motion effects.",
      "Centralized the game catalog so homepage and full Games Hub entries stay in sync.",
    ],
  },
  {
    version: "2.4.2",
    date: "2026-07-26",
    title: "Theme Contrast and Audio Feedback Polish",
    items: [
      "Fixed low-contrast Games and AIGC hero copy in light theme and strengthened light-theme accent colors and controls.",
      "Made every SFX style selection preview the newly selected sound instead of the previous style.",
      "Improved procedural BGM voicing with smoother four-note ambient chords.",
      "Kept BGM playback status synchronized when the browser suspends or resumes Web Audio.",
      "Improved dialog semantics and mobile dynamic-viewport sizing for the settings panel.",
    ],
  },
  {
    version: "2.4.1",
    date: "2026-07-19",
    title: "Deep QA: Audio Lifecycle, Light Theme, and Settings Reliability",
    items: [
      "Fixed SFX on SVG-based controls, hardened Web Audio unlock and failure handling, and added live BGM playback status.",
      "Repaired low-contrast light-theme surfaces across Contact, footer actions, settings changelog, buttons, and hover states.",
      "Made Clear Cache distinct from Reset, validated imported SFX styles, and restored the user's previous volume after unmuting.",
      "Restored staggered reveals across Tools, Games, and content grids while improving reveal memory usage and reduced-motion behavior.",
      "Improved modal focus trapping, switch hit targets, selection semantics, animation control states, and shortcut feedback.",
    ],
  },
  {
    version: "2.4.0",
    date: "2026-07-16",
    title: "Site-wide UI, UX, Audio, and Accessibility Pass",
    items: [
      "Added opt-in procedural ambient BGM and interaction-aware sound effects with safer volume behavior.",
      "Fixed mobile overflow, settings focus management, animation speed scaling, and contrast rendering for fixed controls.",
      "Removed non-functional performance settings and replaced them with controls that immediately affect the interface.",
      "Improved navigation, keyboard focus, reduced-motion support, real contact destinations, and responsive layouts.",
    ],
  },
  {
    version: "2.3.2",
    date: "2026-06-01",
    title: "QA Pass: Audio Cleanup + Polish",
    items: [
      "Removed all BGM engine code now that BGM controls are gone — legacy localStorage can no longer trigger hidden background audio.",
      "Purged API settings fields from persisted state since the API tab was removed.",
      "Reduced SFX spam: removed range sliders from the SFX trigger list and added 80 ms throttling for rapid interactions.",
      "Fixed Games Hub reveal animation pattern so 15 cards now cycle left / fade / right instead of stacking on one direction.",
      "Fixed Korean translations for footer links (Internal Archive, Press Kit, Contact Studio).",
    ],
  },
  {
    version: "2.3.1",
    date: "2026-06-01",
    title: "Settings Cleanup: Remove BGM and API",
    items: [
      "Removed BGM controls from Audio settings tab — only SFX remains.",
      "Removed API settings tab entirely.",
      "Cleaned up unused imports and simplified AudioTab code.",
    ],
  },
  {
    version: "2.3.0",
    date: "2026-06-01",
    title: "New Game: Subway Surfers",
    items: [
      "Added Subway Surfers to the Games Hub — an endless runner through subway tunnels.",
      "Added gameTagRunner translation key for runner/arcade genre classification.",
      "Added multi-language translations for Subway Surfers title and description.",
    ],
  },
  {
    version: "2.2.0",
    date: "2026-06-01",
    title: "New Games: 2048 Original + 2048 New Era + Sudoku",
    items: [
      "Added 2048 Original to the Games Hub — the classic number-merging puzzle.",
      "Added 2048 New Era to the Games Hub — a modern reimagining with fresh visuals.",
      "Added Sudoku to the Games Hub — the timeless 9×9 logic puzzle.",
      "Added multi-language translations for all three new game titles and descriptions.",
    ],
  },
  {
    version: "2.1.0",
    date: "2026-06-01",
    title: "New Games: 24 Points + XiangQi",
    items: [
      "Added 24 Points to the Games Hub — a fast-paced math card game.",
      "Added XiangQi (Chinese Chess) to the Games Hub — the classic strategy board game.",
      "Added gameTagMath and gameTagChess translation keys for genre classification.",
      "Added multi-language translations for both game titles and descriptions.",
    ],
  },
  {
    version: "2.0.0",
    date: "2026-05-31",
    title: "Deep QA + Global Settings",
    items: [
      "Moved Settings into a site-wide launcher so every page can open the same settings modal.",
      "Implemented the advertised global shortcuts for opening settings, toggling theme, and muting audio.",
      "Added focus trapping and focus restoration to the settings modal for safer keyboard navigation.",
      "Hardened settings import and localStorage loading with type validation, enum checks, and numeric clamping.",
      "Improved BGM status feedback so off, muted, pending, and playing states are reflected accurately.",
      "Updated the old release notice into the historical changelog below this release.",
    ],
  },
  {
    version: "1.9.0",
    date: "2026-05-15",
    title: "New Game: Mahjong",
    items: [
      "Added Mahjong to the Games Hub — the classic Chinese tile-based game with multiple regional rule sets.",
      "Added gameTagBoard translation key for board game genre classification.",
      "Added multi-language translations for Mahjong title and description.",
    ],
  },
  {
    version: "1.8.0",
    date: "2026-05-15",
    title: "New Game: Doudizhu",
    items: [
      "Added Doudizhu (Dou Di Zhu) to the Games Hub — the classic Chinese card game.",
      "Added gameTagCard translation key for card game genre classification.",
      "Added multi-language translations for Doudizhu title and description.",
    ],
  },
  {
    version: "1.7.0",
    date: "2026-05-15",
    title: "AIGC Experiments + Games Hub Expansion",
    items: [
      "Added the AIGC Experiments page with Kimi 2.6 Code, GPT 5.5 Medium, and GPT 5.5 Extra High project entries.",
      "Replaced the Products section Playable Concepts card with the AIGC Experiments entry point.",
      "Added Stellar Defense, Neon Salvage, and Lumen Drift to the Games Hub with newly generated game cover art.",
      "Updated Games Hub copy and multi-language translation keys for the new entries.",
    ],
  },
  {
    version: "1.6.0",
    date: "2026-05-12",
    title: "New Game: Billiards",
    items: [
      "Added Billiards to the Games Hub — a 3D billiards web game.",
      "Added gameTagSports translation key for sports genre classification.",
      "Added multi-language translations for Billiards title and description.",
    ],
  },
  {
    version: "1.5.0",
    date: "2026-05-09",
    title: "Audio Engine + Interaction Polish",
    items: [
      "Updated Tic-Tac-Toe to the hanazar-games GitHub Pages deployment.",
      "Added Web Audio powered SFX feedback and ambient BGM behavior tied to Audio settings.",
      "Added SFX preview control and restored access to the full BGM style list.",
      "Improved reveal, hover, and keyboard focus states across homepage, games, and settings UI.",
    ],
  },
  {
    version: "1.4.0",
    date: "2026-05-08",
    title: "Games Hub Visuals + i18n Polish",
    items: [
      "Added game preview images to all three game cards on the Games Hub page.",
      "Fixed remaining untranslated placeholder in API settings tab.",
      "Verified complete i18n coverage across homepage, games page, settings modal, and all 10 settings tabs.",
      "All 20 interface languages, aria-labels, and dynamic html lang attribute confirmed working.",
    ],
  },
  {
    version: "1.2.3",
    date: "2026-05-08",
    title: "Bug Fix Release",
    items: [
      "Fixed: Clear Cache now only removes hanazar-settings-v1 instead of wiping all localStorage.",
      "Fixed: Tab switching no longer re-mounts content panel — scroll position resets smoothly via ref.",
      "Fixed: BGM style list trimmed from 40 to 12 curated options for better mobile UX.",
      "Added: Custom dark scrollbar styling for settings panel, language list, and style grid.",
    ],
  },
  {
    version: "1.2.2",
    date: "2026-05-08",
    title: "Full i18n Translation System",
    items: [
      "Wired up complete i18n translation across homepage, games page, settings modal, and all 10 settings tabs.",
      "20 interface languages supported with per-key fallback to English.",
      "Dynamic html lang attribute updates for screen-reader accessibility when switching languages.",
      "All aria-labels translated (Settings, Close settings, Settings categories, Homepage sections, Open settings).",
      "Fixed previously untranslated footer link placeholders, theme buttons, font labels, and input placeholders.",
    ],
  },
  {
    version: "1.2.1",
    date: "2026-05-08",
    title: "Settings Panel Complete",
    items: [
      "Added full Settings Panel with 10 categories: Style, Language, Audio, Animation, Performance, API, Shortcuts, Other, Announcement, About.",
      "20 interface languages with safe character set selection.",
      "Audio controls: Master volume, SFX/BGM toggle, 12 SFX styles, 40 music styles.",
      "Animation controls: Global switch, speed slider, individual effect toggles.",
      "Performance controls: 7 optimization switches + max concurrent slider.",
      "Settings export/import/copy as JSON, reset to defaults, clear local cache.",
      "All settings persisted to localStorage.",
    ],
  },
  {
    version: "1.2.0",
    date: "2026-05-08",
    title: "Settings Panel Alpha",
    items: [
      "Started building the Settings Panel modal framework.",
      "React Context + localStorage persistence layer.",
      "Tab navigation with 10 categories.",
    ],
  },
  {
    version: "1.1.0",
    date: "2026-05-08",
    title: "Games Hub",
    items: [
      "Added /games page with Hero section and staggered fade-in animation.",
      "Linked three deployed games: Tic-Tac-Toe, Minesweeper, 3D 2048.",
      "Games Hub card added to Products section middle slot.",
      "Contact section restored to original placeholder state.",
    ],
  },
  {
    version: "1.0.0",
    date: "2026-05-08",
    title: "Website Launch",
    items: [
      "First release of the Hanazar Games official website.",
      "Single-page layout: Hero, Products, About, Documents, Updates, Contact.",
      "Dark monochrome theme with scroll-triggered reveal animations.",
      "Responsive layout for mobile and desktop.",
    ],
  },
];

export default function AnnouncementTab() {
  const { tr } = useTranslation();
  const [latest, ...history] = changelog;

  return (
    <div className="settingsTabContent">
      <div className="changelogList">
        <div className="changelogEntry changelogEntryLatest" key={latest.version}>
          <div className="changelogHeader">
            <span className="changelogVersion">{latest.version}</span>
            <span className="changelogDate">{latest.date}</span>
          </div>
          <h4 className="changelogTitle">{latest.title}</h4>
          <ul className="changelogItems">
            {latest.items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="changelogHistoryLabel">{tr("changelogHistory")}</div>

        {history.map((entry) => (
          <div className="changelogEntry changelogEntryHistory" key={entry.version}>
            <div className="changelogHeader">
              <span className="changelogVersion">{entry.version}</span>
              <span className="changelogDate">{entry.date}</span>
            </div>
            <h4 className="changelogTitle">{entry.title}</h4>
            <ul className="changelogItems">
              {entry.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
