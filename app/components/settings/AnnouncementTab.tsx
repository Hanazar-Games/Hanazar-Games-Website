"use client";

import { useTranslation } from "../../hooks/useTranslation";

const changelog = [
  {
    version: "2.7.2",
    date: "2026-08-03",
    title: "Chat Recovery and Full-Site QA",
    items: [
      "Added one-time CSRF renewal and retry so Chat writes recover safely after another tab refreshes the session.",
      "Fixed partial Chat startup after transient room-loading failures and added automatic room recovery through the event loop.",
      "Activated the existing general API rate policy while preserving dedicated login and long-poll protections.",
      "Improved mobile sidebar focus isolation, empty-draft typing cleanup, composer height reset, and audio-node teardown.",
      "Rechecked the homepage, Games Hub, AIGC Lab, Tools, Other Products, Chat entry, static export, and low-volume SFX/BGM behavior.",
    ],
  },
  {
    version: "2.7.1",
    date: "2026-08-02",
    title: "Chat Reliability and Deployment QA",
    items: [
      "Fixed Chat heartbeat startup, expired-session recovery, CSRF renewal, retained event cursors, and long-poll resynchronization.",
      "Hardened message retry idempotency, rapid room switching, group member search, typing throttling, and stale asynchronous responses.",
      "Improved mobile sidebar dismissal, compact viewport scrolling, dialog tabs, focus states, touch targets, and archived-room controls.",
      "Further reduced homepage and Chat SFX/BGM output, prevented duplicate notification sounds, and paused audio while the page is hidden.",
      "Repaired cron environment loading, private PHP-FPM error logging, hidden first-admin password input, and verified the GitHub Pages export path.",
    ],
  },
  {
    version: "2.7.0",
    date: "2026-08-02",
    title: "Hanazar Chat Platform",
    items: [
      "Added a dedicated Chat entry to the homepage navigation and footer.",
      "Built the self-hosted PHP 8.2 and SQLite chat service with secure authentication, CSRF protection, persistent rate limits, and hardened sessions.",
      "Added private and group rooms, strict room roles, message pagination, edit/delete tombstones, read receipts, presence, typing state, and bounded event polling.",
      "Created a responsive accessible chat interface with safe URL rendering, opt-in low-volume Web Audio, and full browser lifecycle recovery.",
      "Added Nginx, PHP-FPM, systemd, cron, backup, cleanup, integrity-check, and first-admin deployment tooling for chat.hanazargames.com.",
    ],
  },
  {
    version: "2.6.6",
    date: "2026-08-02",
    title: "Deployment Payload and Full-System QA",
    items: [
      "Removed an unused 18 MB intro video and two orphaned legacy images from the GitHub Pages payload.",
      "Added export guards that reject obsolete assets and prevent the static deployment artifact from silently exceeding 12 MiB.",
      "Verified all routes across six desktop, tablet, mobile, narrow, and landscape viewports without overflow, broken assets, or console errors.",
      "Rechecked themes, translations, settings persistence, focus management, shortcuts, every SFX profile, and BGM lifecycle cleanup.",
      "Confirmed the latest main-branch GitHub Pages deployment and all featured game pages are reachable.",
    ],
  },
  {
    version: "2.6.5",
    date: "2026-07-31",
    title: "Coreball Games Hub Update",
    items: [
      "Added Coreball (见缝插针) to the full Games Hub with a dedicated original cover and localized project details.",
      "Kept the homepage Games Hub focused on its existing three featured projects.",
      "Expanded the GitHub Pages preflight to require the Coreball link and cover asset in the exported Games Hub.",
      "Rechecked responsive layouts, themes, keyboard UX, SFX, BGM, assets, and static deployment output.",
    ],
  },
  {
    version: "2.6.4",
    date: "2026-07-30",
    title: "Homepage Curation and Tools Restructure",
    items: [
      "Curated the homepage Games Hub and AIGC gallery to three focused projects each.",
      "Reorganized Tools into Mac Tools, Web Tools, and Other Tools with responsive group layouts.",
      "Moved LC300A Luochuan OS into Other Tools and removed its duplicate standalone section and navigation entry.",
      "Balanced the three-card Games and AIGC desktop grids while retaining two-column tablet and single-column mobile layouts.",
      "Expanded the GitHub Pages preflight to enforce the curated project sets and all three tool groups.",
      "Deep-checked responsive UI, keyboard UX, themes, translations, SFX, BGM, assets, and static deployment output.",
    ],
  },
  {
    version: "2.6.3",
    date: "2026-07-29",
    title: "Games Hub and Interaction Refinement",
    items: [
      "Added GPT-5.6-sol-Ultra-AIGC-webgame to the homepage and full Games Hub with its Echo Relay cover art.",
      "Fixed settings focus trapping so disabled audio and animation controls can no longer break keyboard wraparound.",
      "Replaced long cumulative game-card reveal delays with short per-column timing for faster browsing.",
      "Further softened interaction SFX and ambient BGM and added SFX cleanup when a browser audio clock stalls.",
      "Expanded the GitHub Pages preflight to require the new Games Hub entry on both exported routes.",
      "Rechecked responsive layouts, project assets, keyboard navigation, SFX, BGM, and static deployment output.",
    ],
  },
  {
    version: "2.6.2",
    date: "2026-07-29",
    title: "Accessibility and Release Integrity QA",
    items: [
      "Made the closing settings dialog inert and hidden from assistive technology until its exit animation finishes.",
      "Removed a mobile keyboard-navigation race so selected settings tabs focus and scroll into view immediately.",
      "Expanded the GitHub Pages preflight to require Guandan, Liar's Bar, LC300A, and GPT-5.6-sol Ultra links and cover assets.",
      "Removed a duplicate decorative arrow announcement from Tools card links.",
      "Verified every route across desktop, tablet, mobile, narrow, and landscape viewports in dark and light themes.",
      "Stress-tested SFX and BGM preview, playback, rapid toggling, muting, and audio-node cleanup without leaks.",
    ],
  },
  {
    version: "2.6.1",
    date: "2026-07-28",
    title: "Deployment Reliability and Deep QA",
    items: [
      "Aligned the GitHub Pages workflow with the current deployment action and protected active deployments from cancellation.",
      "Added a static export preflight for required routes, project assets, base paths, and the new GPT-5.6-sol Ultra entry.",
      "Upgraded Next.js and its transitive build dependencies to patched releases with a clean dependency audit.",
      "Improved long AIGC title wrapping and keyboard navigation within the mobile settings tab strip.",
      "Restored audio unlock when opening settings by keyboard and added Escape close feedback.",
      "Deep-checked desktop and mobile routes, themes, settings, SFX, BGM, accessibility, and Pages project paths.",
    ],
  },
  {
    version: "2.6.0",
    date: "2026-07-28",
    title: "GPT-5.6-sol Ultra AIGC Experiment",
    items: [
      "Added GPT-5.6-sol-Ultra-AIGC-webgame to the AIGC Experiments archive.",
      "Added a real Echo Relay project screenshot and localized project description.",
      "Balanced the expanded AIGC gallery into a responsive two-column layout.",
      "Prevented mobile settings controls from covering subpage cards and respected device safe areas.",
      "Cleaned up SFX and ambient BGM nodes after playback to avoid long-session audio graph buildup.",
    ],
  },
  {
    version: "2.5.1",
    date: "2026-07-27",
    title: "Interaction and Audio Polish",
    items: [
      "Improved mobile settings navigation with a compact horizontal tab strip and larger touch targets.",
      "Reduced modal motion, blur, SFX intensity, and ambient BGM loudness.",
      "Prevented keyboard SFX when Enter or Space does not activate the focused control.",
      "Improved decorative icon accessibility and modal interaction clarity.",
    ],
  },
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
