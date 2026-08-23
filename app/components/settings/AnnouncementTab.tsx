"use client";

import { useTranslation } from "../../hooks/useTranslation";

const changelog = [
  {
    version: "2.17.3",
    date: "2026-08-23",
    title: "Batch 205 Tracking, Cumulative Totals, and WeChat Feedback",
    items: [
      "Added Batch 205 as under review alongside Batch 204 while keeping the published component total at 10,168.",
      "Added a cumulative component-total column to every review row, calculated from Batch 1 through the selected batch on desktop and mobile.",
      "Added a prominent WeChat feedback notice above the anonymous wall and linked directly to the 千川bit official-account QR entry.",
      "Clarified that WeChat feedback receives replies while anonymous wall posts cannot receive one-to-one responses because they contain no contact details.",
      "Extended automated, responsive, and GitHub Pages export checks for the new batch, cumulative values, feedback guidance, and announcement.",
    ],
  },
  {
    version: "2.17.2",
    date: "2026-08-23",
    title: "Three-Day Publishing Pause and Official Account Recovery",
    items: [
      "Paused skin publishing work for three days from this announcement because the operator’s WeChat account was restricted.",
      "Confirmed that the 千川bit official account is available again for notices, review tracking, and author appreciation.",
      "Added a prominent, searchable service-status notice to the review page while keeping the service-center home focused on section entries.",
      "Clarified that resumption timing will follow the latest notice and retained the existing WeChat community pause.",
    ],
  },
  {
    version: "2.17.1",
    date: "2026-08-23",
    title: "WeChat Community Pause and Official Account Appreciation",
    items: [
      "Temporarily closed the WeChat community entries and replaced their QR cards with a clear availability notice while keeping QQ and Discord open.",
      "Added guidance for supporting the author through the ‘赞赏作者’ action at the bottom of the 千川bit official account.",
      "Kept the official-account QR entry easy to reach and retained the warning against payment codes sent through direct messages.",
      "Published both changes in the skin service update history and extended GitHub Pages deployment checks for the revised content.",
    ],
  },
  {
    version: "2.17.0",
    date: "2026-08-22",
    title: "Independent Skin Service Controls and Batch 203 Release",
    items: [
      "Added a sixth skin service route for versioned update notices and included every notice in service-wide search.",
      "Replaced the main-site settings entry inside the skin service with compact, independently stored light, dark, Chinese, English, and Japanese controls.",
      "Published Batch 203 with 97 approved components, advanced Batch 204 to review, and updated the cumulative completed total to 10,168.",
      "Preserved Batch 121 and Batch 201 as zero-component system-update tests while keeping all 204 records in the collapsible tracker.",
      "Refined update cards, navigation density, responsive controls, focus states, reduced-motion behavior, and narrow-screen spacing.",
      "Rechecked the production build, GitHub Pages static export, localized content, dependency security, and desktop and mobile interaction paths.",
    ],
  },
  {
    version: "2.16.0",
    date: "2026-08-20",
    title: "Skin Service Community Navigation and QR Viewer",
    items: [
      "Moved the skin service hub into five dedicated GitHub Pages routes while keeping global search linked to each exact section and item.",
      "Organized community entries into WeChat, QQ, and international Discord groups with compact collapsed cards.",
      "Added an accessible full-size viewer for every WeChat QR image with keyboard focus containment, Escape dismissal, and responsive light and dark layouts.",
      "Added a community notice that reads the live website version and kept the first-visit Minecraft community invitation linked to the community route.",
      "Expanded search coverage, route contracts, export guards, responsive checks, modal isolation, and AIGC first-row image loading.",
      "Rechecked site-wide UI, UX, low-volume SFX, opt-in BGM, themes, accessibility, security, and GitHub Pages deployment output.",
    ],
  },
  {
    version: "2.15.0",
    date: "2026-08-19",
    title: "Focused Skin Service UI and Full-Site QA",
    items: [
      "Made Simplified Chinese the first-use default for the skin service while preserving the user's later Chinese, Japanese, or English choice.",
      "Collapsed all nine community entries into compact accessible groups and made search open and focus the matching entry automatically.",
      "Unified the complete service center under one indigo accent system in both system-aware light and dark themes.",
      "Prevented the first-visit community prompt and Settings from opening as stacked dialogs, with correct background isolation and focus restoration.",
      "Rechecked every route at desktop, tablet, mobile, and 320 px widths alongside images, accessibility references, responsive overflow, SFX, opt-in BGM, and GitHub Pages export behavior.",
    ],
  },
  {
    version: "2.14.0",
    date: "2026-08-18",
    title: "Community QR Access and First-Visit Welcome",
    items: [
      "Added the provided QR artwork for WeChat Groups 2, 4, 7, and 9 alongside the existing QQ and Discord community entries.",
      "Added an accessible first-visit community welcome with View and Not Now actions, keyboard focus containment, Escape support, and direct navigation to the community section.",
      "Refined the service center with shared system theme behavior, Chinese, Japanese, and English copy, richer section colors, responsive QR layouts, and reduced-motion support.",
      "Expanded automated and GitHub Pages validation to cover every community image, deployment path, and the new first-visit experience.",
      "Rechecked UI, UX, SFX, BGM, feedback safety, responsive layouts, and static deployment behavior across the site.",
    ],
  },
  {
    version: "2.13.0",
    date: "2026-08-17",
    title: "Secure Feedback Wall and Full-Site QA",
    items: [
      "Expanded the 代发皮肤服务中心 with verified community entries, searchable help articles, a public feedback wall, review notices, and support placeholders.",
      "Added anonymous feedback creation, five-minute same-browser editing, delayed publication, strict response validation, request cancellation, and safe local edit-token recovery.",
      "Hardened feedback delivery with hashed edit tokens, prepared SQLite statements, content and duplicate defenses, CORS allowlists, application rate limits, and Nginx connection limits.",
      "Kept the service center and its settings dialog consistently light, removed two dead tool links and their unused assets, and retained a three-card Web Tools row.",
      "Recovered Safari interrupted audio contexts while preserving opt-in ambient BGM, throttled SFX, reduced output ceilings, hidden-page pause, and audio-node cleanup.",
      "Rechecked every route at desktop, tablet, mobile, and 320 px widths and revalidated the configured and unconfigured GitHub Pages exports.",
    ],
  },
  {
    version: "2.12.0",
    date: "2026-08-16",
    title: "Tools Archive and Service Center Localization",
    items: [
      "Added a complete Tools Archive while keeping homepage tool groups focused on three featured cards.",
      "Moved Listener into Web Tools, linked directly to its website, and identified it as a multi-source music crawler.",
      "Updated Hept links to open the GitHub Releases page for direct access to published builds.",
      "Converted the skin publishing service page to Chinese-only content and a route-scoped light interface.",
      "Expanded automated and GitHub Pages checks for the new route, tool taxonomy, links, layout, and localization rules.",
    ],
  },
  {
    version: "2.11.0",
    date: "2026-08-16",
    title: "Skin Publishing Service Center",
    items: [
      "Added the 代发皮肤服务中心 entry to the homepage and primary section navigation.",
      "Created a dedicated service documentation route with six structured, content-ready sections.",
      "Added Service Overview, Publishing Process, QA, Frequently Asked Questions, Material Submission, and After-sales and Feedback sections without placeholder copy.",
      "Extended GitHub Pages export validation to cover the new route, homepage entry, and complete document structure.",
    ],
  },
  {
    version: "2.10.4",
    date: "2026-08-15",
    title: "Encrypted Share Expiry and Attachment Validation QA",
    items: [
      "Rejected encrypted-share viewer responses whose expiry exceeds the 24-hour service limit, with a bounded allowance for clock skew.",
      "Released the active viewer countdown and revoked decrypted attachment URLs immediately when a share expires.",
      "Refreshed attachment validation after every removal so recovered file selections no longer retain stale error messages.",
      "Reverified encrypted text and attachments, ciphertext tamper rejection, browser-local logs, and 48 MiB WebRTC interruption recovery.",
      "Rechecked all primary routes at desktop, tablet, mobile, and 320 px widths with no overflow, broken images, hidden content, or runtime errors.",
      "Revalidated all settings categories, 20 languages, reduced SFX, opt-in BGM states, dependency integrity, and GitHub Pages exports.",
    ],
  },
  {
    version: "2.10.3",
    date: "2026-08-11",
    title: "Encrypted Share Timestamp Integrity QA",
    items: [
      "Rejected out-of-range Unix timestamps from the encrypted-share service before they can create invalid dates or unbounded countdowns.",
      "Validated create-response timestamp ordering and the 24-hour maximum lifetime before saving a secret link to the browser-local log.",
      "Reverified encrypted text and attachments, ciphertext tamper rejection, malformed service responses, and local-log privacy behavior.",
      "Rechecked Weida Go, Hept, Listener, Hanazar Transfer, LC300A, Core Ball, Guandan, Liar's Bar, and GPT-5.6-sol-Ultra endpoints and artwork.",
      "Passed desktop and responsive boundary QA across all routes, nine settings categories, SFX/BGM states, and 48 MiB WebRTC interruption recovery.",
      "Revalidated the production build and configured and unconfigured GitHub Pages exports with the synchronized release announcement.",
    ],
  },
  {
    version: "2.10.2",
    date: "2026-08-10",
    title: "Responsive Catalog and Transfer Recovery QA",
    items: [
      "Fixed tablet Games and AIGC grids so 801–980 px layouts use two balanced columns with matching responsive image hints.",
      "Made interrupted WebRTC sends and receives fail visibly instead of remaining stuck in progress, while releasing buffered incoming file data.",
      "Hardened browser-local encrypted-share logs against invalid dates, reversed timestamps, and impossible lifetimes.",
      "Reverified Weida Go, Hept, Listener, Hanazar Transfer, LC300A, homepage catalog limits, tool taxonomy, project links, and artwork.",
      "Completed real encrypted text and attachment exchange, ciphertext tamper rejection, large-transfer interruption, focus, language, SFX, and BGM checks.",
      "Passed desktop, tablet, mobile, and narrow responsive QA plus configured and unconfigured GitHub Pages production verification.",
    ],
  },
  {
    version: "2.10.1",
    date: "2026-08-09",
    title: "Deployment Guard and Interaction Integrity QA",
    items: [
      "Added visible, screen-reader-associated validation for invalid custom expiry values in Encrypted Temporary Share.",
      "Corrected privacy copy to distinguish device-local settings and logs from browser-encrypted ciphertext uploads while confirming keys never leave URL fragments.",
      "Hardened GitHub Pages preflight so malformed Chat service URLs fail clearly instead of silently exporting a disabled feature.",
      "Reverified Weida Go, Hept, Listener, Hanazar Transfer, LC300A, the three-item homepage Games and AIGC sets, and the complete tool taxonomy.",
      "Completed real encrypted share, attachment, tamper rejection, WebRTC text and file transfer, settings focus, theme, language, SFX, and BGM interaction checks.",
      "Passed desktop, tablet, mobile, and narrow responsive QA plus both configured and unconfigured GitHub Pages production exports.",
    ],
  },
  {
    version: "2.10.0",
    date: "2026-08-09",
    title: "Weida Go and Cross-platform Tools Expansion",
    items: [
      "Added Weida Go to the full Games Hub with original board artwork while keeping the homepage focused on three featured games.",
      "Added a dedicated iOS Tools section for Hept, the native haptic control, pattern design, reminders, and vibration measurement app.",
      "Added Listener to Other Tools and Hanazar Transfer to Web Tools with accurate deployment notes and original project artwork.",
      "Centralized the complete tool catalog, added the new projects to footer discovery, and hardened group counts and reveal sequencing for future sections.",
      "Expanded GitHub Pages preflight coverage to require every new route, link, section, and image asset in the static export.",
      "Rechecked responsive card layouts, translations, themes, reduced motion, opt-in BGM, reduced SFX ceilings, and production deployment output.",
    ],
  },
  {
    version: "2.9.2",
    date: "2026-08-08",
    title: "Encrypted Share Accessibility, Performance, and Security QA",
    items: [
      "Stopped idle Chat pages from re-rendering every second while retaining exact active-share and send-log expiry updates.",
      "Removed countdown and file-progress containers from live regions so screen readers receive completion notices without high-frequency interruptions.",
      "Added pressed-state semantics and invalid-expiry feedback, and blocked bidirectional attachment-name spoofing before upload and in the composer.",
      "Prevented disabled controls from producing misleading SFX while preserving low output ceilings, opt-in BGM, visibility pause, and audio cleanup.",
      "Eager-loaded visible archive image rows, fixed the current dependency advisory, and rechecked static Pages output and responsive routes.",
      "Regression-tested encrypted text and attachments, local log cleanup, settings, themes, missing routes, and mobile-to-desktop overflow behavior.",
    ],
  },
  {
    version: "2.9.1",
    date: "2026-08-07",
    title: "Encrypted Share Hardening and Full-Site QA",
    items: [
      "Cleared plaintext composer data and attachment handles immediately after an encrypted share is created.",
      "Fixed hash-only key changes, repeat attachment selection, stable expiry effects, object-URL cleanup, and malformed payload error classification.",
      "Stopped per-second countdown announcements from overwhelming screen readers and refined compact mobile share controls.",
      "Further reduced SFX and ambient BGM output while retaining opt-in BGM, throttled interactions, and hidden-page pause behavior.",
      "Rechecked GitHub Pages base paths, static assets, encrypted-share deployment guards, themes, translations, and responsive layouts.",
      "Blocked bidirectional filename spoofing and added quality contracts for encryption integrity, sensitive-state cleanup, accessibility, and audio ceilings.",
    ],
  },
  {
    version: "2.9.0",
    date: "2026-08-07",
    title: "Encrypted Expiring Shares",
    items: [
      "Rebuilt the public Chat route as an encrypted temporary delivery box for text and arbitrary attachment types.",
      "Added browser-side AES-256-GCM encryption, 256-bit random share addresses, fragment-only keys, and ciphertext integrity verification.",
      "Added adjustable 1–1440 minute expiry, exact read denial, browser memory cleanup, and minute-level server ciphertext deletion.",
      "Added private share-link creation, copy controls, receive-side countdowns, safe attachment downloads, and clear error recovery.",
      "Added a browser-local send log that stores no plaintext or attachment content and removes secret links automatically at expiry.",
      "Added public PHP share endpoints with hashed tokens, strict HTTPS CORS allowlists, isolated rate limits, payload limits, and deployment checks.",
      "Redesigned the Chat UI for desktop and mobile while preserving the separate device-to-device File Transfer Assistant.",
    ],
  },
  {
    version: "2.8.0",
    date: "2026-08-05",
    title: "Peer Chat, File Transfer Assistant, and Deployment QA",
    items: [
      "Replaced the Chat status placeholder with a working WebRTC peer Chat that runs directly on GitHub Pages.",
      "Added a File Transfer Assistant for direct text, TXT, and regular file sharing between two computers.",
      "Added manual offer-and-answer pairing, encrypted data channels, 64 KiB chunks, backpressure, progress feedback, and a 50 MiB per-file limit.",
      "Kept messages and files in browser memory only, added safe local download links, and enabled TXT transcript export.",
      "Added Chat and Transfer entries to the homepage and retained the optional HTTPS member Chat service switch.",
      "Simplified the new responsive UI, softened default SFX/BGM output, and rechecked static deployment, themes, accessibility, and transfer recovery.",
    ],
  },
  {
    version: "2.7.3",
    date: "2026-08-05",
    title: "Deployment-safe Chat Entry and Full-Site QA",
    items: [
      "Replaced the unconfigured Chat subdomain link with an internal status route that works on GitHub Pages and the main Vercel domain.",
      "Restored the missing three-project AIGC preview on the homepage and kept its complete archive available as a dedicated route.",
      "Added a deployment-ready HTTPS service switch so the real PHP Chat login can be enabled without changing homepage source code.",
      "Documented the separate PHP 8.2, persistent SQLite, TLS, and DNS requirements instead of presenting the backend as already online.",
      "Removed reduced-motion animation delays and corrected Chat status translations for a faster, clearer accessible experience.",
      "Updated the PostCSS override to 8.5.23, clearing two moderate dependency advisories without forcing a broader Next.js upgrade.",
      "Rechecked responsive layouts, themes, project counts, images, SFX/BGM lifecycle, PHP syntax, and the complete static export.",
    ],
  },
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
