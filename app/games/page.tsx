"use client";

import Link from "next/link";
import type { CSSProperties } from "react";

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
  return (
    <main className="pageShell gamesShell">
      <div className="gamesHeader reveal revealFade" data-reveal>
        <Link href="/" className="gamesBackLink">
          ← Back to Home
        </Link>
        <h1 className="gamesTitle">Games Hub</h1>
        <p className="gamesSubtitle">
          A growing collection of browser-based games built by Hanazar Games.
          Click any card to play — no install needed.
        </p>
      </div>

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
