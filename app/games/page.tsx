"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect } from "react";

const games = [
  {
    title: "Tic-Tac-Toe",
    description:
      "Classic tic-tac-toe with a modern twist — includes Connect Four, Gomoku, custom boards, AI opponents, puzzle rush, tactics trainer, and full replay analysis.",
    href: "https://hzagaming.github.io/Tic-Tac-Toe/",
    tag: "Strategy"
  },
  {
    title: "Minesweeper",
    description:
      "The timeless mine-clearing puzzle. Use logic and intuition to flag every mine without setting one off.",
    href: "https://hanazar-games.github.io/Minesweeper/",
    tag: "Puzzle"
  },
  {
    title: "3D 2048",
    description:
      "The classic number-merging game reimagined in three dimensions. Slide blocks in 3D space and reach 2048.",
    href: "https://hanazar-games.github.io/3D-2048-webgame/",
    tag: "Arcade"
  }
];

export default function GamesPage() {
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
          <Link href="/" className="gamesBackLink">
            ← Back to Home
          </Link>
          <span className="gamesHeroEyebrow">Hanazar Games</span>
          <h1 className="gamesHeroTitle">Games Hub</h1>
          <p className="gamesHeroSubtitle">
            A growing collection of browser-based games built by Hanazar Games.
            No install needed — click and play.
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
            <span className="gameCardTag">{game.tag}</span>
            <h2>{game.title}</h2>
            <p>{game.description}</p>
            <a
              className="gameCardButton"
              href={game.href}
              target="_blank"
              rel="noreferrer"
            >
              Play Game
              <span className="gameCardArrow">↗</span>
            </a>
          </article>
        ))}
      </div>

      <div className="gamesCta reveal revealFade" data-reveal>
        <p>More games coming soon.</p>
        <Link href="/" className="gamesHomeButton">
          Return to Homepage
        </Link>
      </div>
    </main>
  );
}
