"use client";

import { useTranslation } from "../../hooks/useTranslation";

export default function AboutTab() {
  const { tr } = useTranslation();

  return (
    <div className="settingsTabContent">
      <div className="aboutContent">
        <h3 className="aboutTitle">{tr("aboutProjectTitle")}</h3>
        <p className="aboutDesc">
          {tr("aboutProjectDesc")}
        </p>

        <div className="aboutSection">
          <span className="settingLabel">{tr("aboutAuthor")}</span>
          <p className="aboutDesc">{tr("aboutAuthorName")}</p>
        </div>

        <div className="aboutSection">
          <span className="settingLabel">{tr("aboutLinks")}</span>
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
          <span className="settingLabel">{tr("aboutVersion")}</span>
          <p className="aboutDesc">1.5.0</p>
        </div>

        <div className="aboutFooter">
          <p>{tr("aboutContact")}</p>
          <p>{tr("aboutCopyright")}</p>
          <p className="aboutPrivacy">
            {tr("aboutPrivacy")}
          </p>
        </div>
      </div>
    </div>
  );
}
