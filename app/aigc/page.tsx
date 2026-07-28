"use client";

import Link from "next/link";
import Image from "next/image";
import type { CSSProperties } from "react";
import { useTranslation } from "../hooks/useTranslation";
import { useRevealOnScroll } from "../hooks/useRevealOnScroll";
import { assetPath } from "../lib/paths";

const experiments = [
  {
    title: "aigcGpt56UltraTitle",
    description: "aigcGpt56UltraDesc",
    href: "https://hanazar-games.github.io/GPT-5.6-sol-Ultra-AIGC-webgame/",
    tag: "aigcTagGpt56Ultra",
    image: "/aigc/gpt-56-sol-ultra.jpg"
  },
  {
    title: "aigcKimiTitle",
    description: "aigcKimiDesc",
    href: "https://hanazar-games.github.io/Kimi2.6-AIGC-Webgame-Project/",
    tag: "aigcTagKimi",
    image: "/aigc/kimi-26-code.jpg"
  },
  {
    title: "aigcGptMediumTitle",
    description: "aigcGptMediumDesc",
    href: "https://hanazar-games.github.io/GPT-AIGC-Webgame-Project",
    tag: "aigcTagGptMedium",
    image: "/aigc/gpt-55-medium.jpg"
  },
  {
    title: "aigcGptMaxTitle",
    description: "aigcGptMaxDesc",
    href: "https://hanazar-games.github.io/GPT-MAX-AIGC-Webgame-Project",
    tag: "aigcTagGptMax",
    image: "/aigc/gpt-55-extrahigh.jpg"
  }
];

export default function AigcPage() {
  const { tr } = useTranslation();

  useRevealOnScroll();

  return (
    <main className="pageShell gamesShell">
      <section className="gamesHero aigcHero">
        <Link href="/" className="gamesHeroBack">
          {tr("gamesBackHome")}
        </Link>
        <div className="gamesHeroInner">
          <span className="gamesHeroEyebrow">{tr("aigcHeroEyebrow")}</span>
          <h1 className="gamesHeroTitle">{tr("aigcHeroTitle")}</h1>
          <p className="gamesHeroSubtitle">
            {tr("aigcHeroSubtitle")}
          </p>
        </div>
      </section>

      <div className="gamesGrid aigcGrid">
        {experiments.map((experiment, index) => (
          <article
            key={experiment.title}
            className={`gameCard ${index % 2 === 0 ? "revealLeft" : "revealRight"}`}
            data-reveal
            style={{ "--reveal-delay": `${index * 0.12}s` } as CSSProperties}
          >
            <div className="gameCardImageWrap">
              <Image
                src={assetPath(experiment.image)}
                alt={tr(experiment.title)}
                className="gameCardImage"
                width={960}
                height={540}
                sizes="(max-width: 800px) 100vw, 33vw"
              />
            </div>
            <div className="gameCardBody">
              <span className="gameCardTag">{tr(experiment.tag)}</span>
              <h2>{tr(experiment.title)}</h2>
              <p>{tr(experiment.description)}</p>
              <a
                className="gameCardButton"
                href={experiment.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${tr("aigcOpenButton")}: ${tr(experiment.title)}`}
              >
                {tr("aigcOpenButton")}
                <span className="gameCardArrow" aria-hidden="true">↗</span>
              </a>
            </div>
          </article>
        ))}
      </div>

      <div className="gamesCta reveal revealFade" data-reveal>
        <p>{tr("aigcMoreSoon")}</p>
        <Link href="/" className="gamesHomeButton">
          {tr("gamesBackHome")}
        </Link>
      </div>
    </main>
  );
}
