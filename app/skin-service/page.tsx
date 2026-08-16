"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useTranslation } from "../hooks/useTranslation";
import { useRevealOnScroll } from "../hooks/useRevealOnScroll";

const sections = [
  { id: "overview", title: "skinServiceOverview" },
  { id: "process", title: "skinServiceProcess" },
  { id: "qa", title: "skinServiceQa" },
  { id: "faq", title: "skinServiceFaq" },
  { id: "materials", title: "skinServiceMaterials" },
  { id: "support", title: "skinServiceSupport" },
];

export default function SkinServicePage() {
  const { tr } = useTranslation();

  useRevealOnScroll();

  return (
    <main className="pageShell gamesShell skinServiceShell">
      <section className="gamesHero skinServiceHero">
        <Link href="/" className="gamesHeroBack">
          {tr("skinServiceBackHome")}
        </Link>
        <div className="gamesHeroInner">
          <span className="gamesHeroEyebrow">{tr("skinServiceEyebrow")}</span>
          <h1 className="gamesHeroTitle">{tr("skinServiceTitle")}</h1>
        </div>
      </section>

      <nav className="skinServiceIndex" aria-label={tr("skinServiceIndexLabel")}>
        {sections.map((section, index) => (
          <a
            key={section.id}
            className="skinServiceIndexLink reveal revealFade"
            href={`#${section.id}`}
            data-reveal
            style={{ "--reveal-delay": `${(index % 3) * 0.06}s` } as CSSProperties}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            {tr(section.title)}
          </a>
        ))}
      </nav>

      <div className="skinServiceDocument">
        {sections.map((section, index) => (
          <section
            key={section.id}
            className={`skinServiceDocumentSection ${index % 2 === 0 ? "revealLeft" : "revealRight"}`}
            id={section.id}
            data-reveal
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            <h2>{tr(section.title)}</h2>
          </section>
        ))}
      </div>
    </main>
  );
}
