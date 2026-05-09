"use client";

import { useTranslation } from "../../hooks/useTranslation";

const changelog = [
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
    version: "1.2.2",
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

  return (
    <div className="settingsTabContent">
      <div className="changelogList">
        {changelog.map((entry) => (
          <div className="changelogEntry" key={entry.version}>
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
