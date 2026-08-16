"use client";

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { useRevealOnScroll } from "../hooks/useRevealOnScroll";
import { useTranslation } from "../hooks/useTranslation";
import { toolGroups } from "../lib/catalog";
import { assetPath } from "../lib/paths";

export default function ToolsPage() {
  const { tr } = useTranslation();

  useRevealOnScroll();

  return (
    <main className="pageShell gamesShell toolsArchiveShell">
      <section className="gamesHero toolsArchiveHero">
        <Link href="/" className="gamesHeroBack">
          {tr("gamesBackHome")}
        </Link>
        <div className="gamesHeroInner">
          <span className="gamesHeroEyebrow">{tr("toolsArchiveEyebrow")}</span>
          <h1 className="gamesHeroTitle">{tr("toolsArchiveTitle")}</h1>
          <p className="gamesHeroSubtitle">{tr("toolsArchiveSubtitle")}</p>
        </div>
      </section>

      <div className="toolsArchiveGroups">
        {toolGroups.map((group, groupIndex) => (
          <section className="toolsGroup" key={group.title}>
            <div
              className={`toolsGroupHeading ${groupIndex % 2 === 0 ? "revealLeft" : "revealRight"}`}
              data-reveal
            >
              <div>
                <span className="toolsGroupLabel">{tr(group.label)}</span>
                <h2>{tr(group.title)}</h2>
              </div>
              <span className="toolsGroupCount">{String(group.tools.length).padStart(2, "0")}</span>
            </div>

            <div className={`toolsGrid${group.tools.length === 1 ? " toolsGridSingle" : ""}`}>
              {group.tools.map((tool, index) => (
                <article
                  key={tool.title}
                  className={`gameCard toolCard${group.tools.length === 1 ? " toolCardWide" : ""} ${
                    index % 3 === 0
                      ? "revealLeft"
                      : index % 3 === 1
                        ? "revealFade"
                        : "revealRight"
                  }`}
                  data-reveal
                  style={{ "--reveal-delay": `${(index % 3) * 0.06}s` } as CSSProperties}
                >
                  <div className="gameCardImageWrap">
                    <Image
                      src={assetPath(tool.image)}
                      alt={tr(tool.title)}
                      className="gameCardImage"
                      width={1280}
                      height={720}
                      loading={groupIndex === 0 && index < 2 ? "eager" : "lazy"}
                      sizes={group.tools.length === 1
                        ? "(max-width: 980px) 100vw, 54vw"
                        : "(max-width: 800px) 100vw, (max-width: 980px) 50vw, 33vw"}
                    />
                  </div>
                  <div className="gameCardBody">
                    <span className="gameCardTag">{tr(tool.tag)}</span>
                    <h3>{tr(tool.title)}</h3>
                    <p>{tr(tool.description)}</p>
                    <a
                      className="gameCardButton"
                      href={tool.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${tr(tool.cta)}: ${tr(tool.title)}`}
                    >
                      {tr(tool.cta)}
                      <span className="gameCardArrow" aria-hidden="true">↗</span>
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
