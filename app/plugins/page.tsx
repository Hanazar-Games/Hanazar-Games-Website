"use client";

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { useRevealOnScroll } from "../hooks/useRevealOnScroll";
import { useTranslation } from "../hooks/useTranslation";
import { browserPlugins } from "../lib/catalog";
import { assetPath } from "../lib/paths";

const revealClasses = ["revealLeft", "revealRight"];

export default function PluginsPage() {
  const { tr } = useTranslation();

  useRevealOnScroll();

  return (
    <main className="pageShell gamesShell pluginsShell">
      <section className="gamesHero pluginsHero">
        <Link href="/" className="gamesHeroBack">
          {tr("gamesBackHome")}
        </Link>
        <div className="gamesHeroInner">
          <span className="gamesHeroEyebrow">{tr("pluginsHeroEyebrow")}</span>
          <h1 className="gamesHeroTitle">{tr("browserPluginsTitle")}</h1>
          <p className="gamesHeroSubtitle">{tr("pluginsHeroSubtitle")}</p>
        </div>
      </section>

      <div className="gamesGrid pluginsGrid">
        {browserPlugins.map((plugin, index) => (
          <article
            key={plugin.title}
            className={`gameCard pluginCard ${revealClasses[index % revealClasses.length]}`}
            data-reveal
            style={{ "--reveal-delay": `${(index % 2) * 0.06}s` } as CSSProperties}
          >
            <div className="gameCardImageWrap">
              <Image
                src={assetPath(plugin.image)}
                alt={tr(plugin.title)}
                className="gameCardImage"
                width={512}
                height={512}
                loading="eager"
                sizes="(max-width: 800px) 100vw, 50vw"
              />
            </div>
            <div className="gameCardBody">
              <span className="gameCardTag">{tr(plugin.tag)}</span>
              <h2>{tr(plugin.title)}</h2>
              <p>{tr(plugin.description)}</p>
              <a
                className="gameCardButton"
                href={plugin.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${tr(plugin.cta)}: ${tr(plugin.title)}`}
              >
                {tr(plugin.cta)}
                <span className="gameCardArrow" aria-hidden="true">↗</span>
              </a>
            </div>
          </article>
        ))}
      </div>

      <div className="gamesCta reveal revealFade" data-reveal>
        <p>{tr("pluginsMoreSoon")}</p>
        <Link href="/" className="gamesHomeButton">
          {tr("gamesBackHome")}
        </Link>
      </div>
    </main>
  );
}
