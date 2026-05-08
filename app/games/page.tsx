"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect } from "react";
import { useTranslation } from "../hooks/useTranslation";

const games = [
  {
    title: "gameTicTacToeTitle",
    description: "gameTicTacToeDesc",
    href: "https://hzagaming.github.io/Tic-Tac-Toe/",
    tag: "gameTagStrategy"
  },
  {
    title: "gameMinesweeperTitle",
    description: "gameMinesweeperDesc",
    href: "https://hanazar-games.github.io/Minesweeper/",
    tag: "gameTagPuzzle"
  },
  {
    title: "game2048Title",
    description: "game2048Desc",
    href: "https://hanazar-games.github.io/3D-2048-webgame/",
    tag: "gameTagArcade"
  }
];

export default function GamesPage() {
  const { tr } = useTranslation();

  useEffect(() => {
    const nodes = document.querySelectorAll<HTMLElement>("[data-reveal]");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealVisible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16, rootMargin: "0px 0px -10% 0px" }
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  return (
    <main className="pageShell gamesShell">
      <section className="gamesHero">
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
            className={`gameCard ${
              index === 0 ? "revealLeft" : index === 1 ? "revealFade" : "revealRight"
            }`}
            data-reveal
            style={{ "--reveal-delay": `${index * 0.12}s` } as CSSProperties}
          >
            <span className="gameCardTag">{tr(game.tag)}</span>
            <h2>{tr(game.title)}</h2>
            <p>{tr(game.description)}</p>
            <a
              className="gameCardButton"
              href={game.href}
              target="_blank"
              rel="noreferrer"
            >
              {tr("gamePlayButton")}
              <span className="gameCardArrow">↗</span>
            </a>
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
