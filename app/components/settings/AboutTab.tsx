"use client";

export default function AboutTab() {
  return (
    <div className="settingsTabContent">
      <div className="aboutContent">
        <h3 className="aboutTitle">Hanazar Games</h3>
        <p className="aboutDesc">
          An independent game studio built around atmosphere, strong visual identity,
          and worlds that feel deliberate from the first screen to the final detail.
          This site serves as a central archive for projects, development notes, and
          public-facing material around each release.
        </p>

        <div className="aboutSection">
          <span className="settingLabel">Author</span>
          <p className="aboutDesc">Hanazar Ochikawa</p>
        </div>

        <div className="aboutSection">
          <span className="settingLabel">Links</span>
          <div className="aboutLinks">
            <a href="https://github.com/hzagaming" target="_blank" rel="noreferrer">
              GitHub
            </a>
            <a href="https://hzagaming.github.io/" target="_blank" rel="noreferrer">
              Live2D Portal
            </a>
            <a href="https://hanazar-games.github.io/" target="_blank" rel="noreferrer">
              Games Portal
            </a>
          </div>
        </div>

        <div className="aboutSection">
          <span className="settingLabel">Version</span>
          <p className="aboutDesc">1.2.2</p>
        </div>

        <div className="aboutFooter">
          <p>Contact: hanazar@mirako.co</p>
          <p>Copyright &copy; 2026 Mirako Company. Developed by Hanazar Ochikawa.</p>
          <p className="aboutPrivacy">
            All information on this site is stored locally.
            No personal data or API keys are uploaded.
          </p>
        </div>
      </div>
    </div>
  );
}
