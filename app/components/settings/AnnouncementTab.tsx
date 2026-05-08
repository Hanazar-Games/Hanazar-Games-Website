"use client";

const changelog = [
  {
    version: "0.8.0",
    date: "2026-05-05",
    title: "Cloud Deployment Edition",
    items: [
      "Zeabur cloud deployment successful, completely removed rembg/Python dependency, switched to pure Node.js runtime.",
      "Added health checks and crash capture.",
      "Frontend cutout fully online.",
      "Stability enhancements: uncaughtException / unhandledRejection capture, global request logging middleware.",
    ],
  },
  {
    version: "0.7.0",
    date: "2026-04-20",
    title: "Settings Panel Release",
    items: [
      "Added full settings panel with 10 categories.",
      "Style, language, audio, animation, performance, API, shortcuts, and more.",
      "All settings persisted in localStorage.",
    ],
  },
  {
    version: "0.6.0",
    date: "2026-04-01",
    title: "Games Hub Launch",
    items: [
      "Added Games Hub page with Tic-Tac-Toe, Minesweeper, and 3D 2048.",
      "Products section now links to the game collection.",
      "New hero animation for the games page.",
    ],
  },
  {
    version: "0.5.0",
    date: "2026-03-15",
    title: "Website Redesign",
    items: [
      "Complete visual overhaul with dark monochrome theme.",
      "Scroll-triggered reveal animations.",
      "Responsive layout for mobile and desktop.",
    ],
  },
  {
    version: "0.1.0",
    date: "2026-02-01",
    title: "Initial Release",
    items: [
      "First version of the Hanazar Games official website.",
      "Single-page layout with hero, products, about, documents, updates, and contact.",
    ],
  },
];

export default function AnnouncementTab() {
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
