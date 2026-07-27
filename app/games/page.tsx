"use client";

import Link from "next/link";
import Image from "next/image";
import type { CSSProperties } from "react";
import { useTranslation } from "../hooks/useTranslation";
import { useRevealOnScroll } from "../hooks/useRevealOnScroll";
import { games } from "../lib/catalog";
import { assetPath } from "../lib/paths";

function revealClassForIndex(index: number): string {
  switch (index % 3) {
    case 0:
      return "revealLeft";
    case 1:
      return "revealFade";
    default:
      return "revealRight";
  }
}

export default function GamesPage() {
  const { tr } = useTranslation();

  useRevealOnScroll();

  return (
    <main className="pageShell gamesShell">
      <section className="gamesHero">
        <Link href="/" className="gamesHeroBack">
          {tr("gamesBackHome")}
        </Link>
        <div className="gamesHeroInner">
          <span className="gamesHeroEyebrow">{tr("gamesHeroEyebrow")}</span>
          <h1 className="gamesHeroTitle">{tr("gamesHeroTitle")}</h1>
          <p className="gamesHeroSubtitle">
            {tr("gamesHeroSubtitle")}
          </p>
        </div>
      </section>

      <div className="gamesGrid">
        {games.map((game, index) => (
          <article
            key={game.title}
            className={`gameCard ${revealClassForIndex(index)}`}
            data-reveal
            style={{ "--reveal-delay": `${index * 0.12}s` } as CSSProperties}
          >
            <div className="gameCardImageWrap">
              <Image
                src={assetPath(game.image)}
                alt={tr(game.title)}
                className="gameCardImage"
                width={640}
                height={360}
                sizes="(max-width: 800px) 100vw, 33vw"
              />
            </div>
            <div className="gameCardBody">
              <span className="gameCardTag">{tr(game.tag)}</span>
              <h2>{tr(game.title)}</h2>
              <p>{tr(game.description)}</p>
              <a
                className="gameCardButton"
                href={game.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${tr("gamePlayButton")}: ${tr(game.title)}`}
              >
                {tr("gamePlayButton")}
                <span className="gameCardArrow" aria-hidden="true">↗</span>
              </a>
            </div>
          </article>
        ))}
      </div>

      <div className="gamesCta reveal revealFade" data-reveal>
        <p>{tr("gamesMoreSoon")}</p>
        <Link href="/" className="gamesHomeButton">
          {tr("gamesBackHome")}
        </Link>
      </div>
    </main>
  );
}
