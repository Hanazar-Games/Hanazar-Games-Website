"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import SettingsPanel from "./components/SettingsPanel";

const githubUrl = "https://github.com/hzagaming";
const heroBackdropImage = "/IntroPic.jpg";

const heroLinks = [
  { label: "Products", href: "#products" },
  { label: "About", href: "#about" },
  { label: "Documents", href: "#documents" },
  { label: "Updates", href: "#updates" },
  { label: "Contact", href: "#contact" }
];

const productModules = [
  {
    title: "Featured Title",
    body: "Use this card for your main project showcase, store link, or the game you want visitors to see first.",
    cta: "View GitHub",
    href: githubUrl,
    icon: true
  },
  {
    title: "Games Hub",
    body: "A collection of browser-based mini-games — Tic-Tac-Toe, Minesweeper, and 3D 2048. Click to play directly in your browser.",
    cta: "Play Now",
    href: "/games",
    icon: true
  },
  {
    title: "Playable Concepts",
    body: "Use this module for prototypes, upcoming releases, or experimental ideas that you want to surface early.",
    cta: "View GitHub",
    href: githubUrl,
    icon: true
  }
];

const documentModules = [
  {
    title: "Design Docs",
    body: "Gameplay structure, mechanics breakdowns, loop design, and system planning."
  },
  {
    title: "Lore Notes",
    body: "Setting history, worldbuilding fragments, naming systems, and narrative references."
  },
  {
    title: "Visual Direction",
    body: "Moodboards, UI direction, color studies, layout standards, and brand language."
  }
];

const updateModules = [
  {
    title: "Devlog",
    body: "A living stream of progress, experiments, milestones, and production snapshots."
  },
  {
    title: "Release Notes",
    body: "Patch notes, version summaries, feature additions, and change history."
  },
  {
    title: "Studio News",
    body: "Announcements, roadmap moments, festival news, and public updates from the team."
  }
];

const contactModules = [
  {
    title: "Steam",
    body: "Direct players to your store page, game hub, or current featured release."
  },
  {
    title: "Business",
    body: "Reserve this area for partnerships, press, publishing inquiries, or contact mail."
  },
  {
    title: "Community",
    body: "Link out to Discord, social channels, or a future community portal when ready."
  }
];

const footerCtas = [
  { title: "Play on Steam", href: githubUrl },
  { title: "View Projects", href: githubUrl },
  { title: "Contact Studio", href: githubUrl }
];

const footerColumns = [
  {
    title: "Games",
    links: ["Featured Title", "Worlds & Characters", "Playable Concepts", "Upcoming Releases"]
  },
  {
    title: "Documents",
    links: ["Design Docs", "Lore Notes", "Visual Direction", "Internal Archive"]
  },
  {
    title: "Updates",
    links: ["Devlog", "Release Notes", "Announcements", "Roadmap"]
  },
  {
    title: "Studio",
    links: ["About HanazarGames", "Contact", "Press Kit", "Partnerships"]
  },
  {
    title: "Support",
    links: ["GitHub", "Steam", "Community", "Privacy"]
  }
];

export default function HomePage() {
  const [settingsOpen, setSettingsOpen] = useState(false);

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
      {
        threshold: 0.16,
        rootMargin: "0px 0px -10% 0px"
      }
    );

    nodes.forEach((node) => observer.observe(node));

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <main className="pageShell">
      <section className="heroSection">
        <div className="heroBackdrop" aria-hidden="true">
          <div className="heroImageLayer">
            <Image
              src={heroBackdropImage}
              alt=""
              className="heroImage"
              fill
              priority
              sizes="100vw"
            />
          </div>
          <div className="floatingPanels">
            <div className="floatingPanel floatingPanelLeft" />
            <div className="floatingPanel floatingPanelRight" />
          </div>
        </div>

        <div className="heroInner">
          <span className="heroEyebrow">Hanazar Games</span>
          <h1 className="heroTitle">Welcome to Hanazar Games</h1>
          <p className="heroSubtitle">
            A focused home for projects, documents, development notes, and the
            growing archive behind every world we build.
          </p>

          <nav className="heroNav" aria-label="Homepage sections">
            {heroLinks.map((link, index) => (
              <a
                key={link.href}
                className="heroNavButton"
                href={link.href}
                style={{ "--button-index": index } as CSSProperties}
              >
                {link.label}
              </a>
            ))}
            <button
              className="heroNavButton"
              onClick={() => setSettingsOpen(true)}
              style={{ "--button-index": heroLinks.length } as CSSProperties}
              aria-label="Open settings"
            >
              Settings
            </button>
          </nav>

          <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        </div>
      </section>

      <section className="contentSection productsSection" id="products">
        <div className="sectionHeading reveal revealFade" data-reveal>
          <span className="sectionIndex">01</span>
          <h2>Products</h2>
        </div>

        <div className="productsFrame reveal revealFade" data-reveal>
          {productModules.map((module, index) => (
            <article
              key={module.title}
              className={`productModule ${
                index === 0
                  ? "revealLeft"
                  : index === 1
                    ? "revealFade"
                    : "revealRight"
              }`}
              data-reveal
              style={{ "--reveal-delay": `${index * 0.12}s` } as CSSProperties}
            >
              {module.icon ? (
                <div className="moduleIconWrap">
                  <Image
                    src="/hanazar-emblem.svg"
                    alt="Hanazar emblem"
                    width={108}
                    height={108}
                  />
                </div>
              ) : null}
              <h3>{module.title}</h3>
              <p>{module.body}</p>
              {module.href ? (
                module.href.startsWith("/") ? (
                  <Link className="moduleButton" href={module.href}>
                    {module.cta}
                  </Link>
                ) : (
                  <a
                    className="moduleButton"
                    href={module.href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {module.cta}
                  </a>
                )
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className="contentSection aboutSection" id="about">
        <div className="sectionHeading reveal revealLeft" data-reveal>
          <span className="sectionIndex">02</span>
          <h2>About HanazarGames</h2>
        </div>

        <div className="aboutPanel reveal revealRight" data-reveal>
          <p>
            Hanazar Games is an independent game studio built around atmosphere,
            strong visual identity, and worlds that feel deliberate from the first
            screen to the final detail.
          </p>
          <p>
            This site is designed to grow into a central archive for our projects,
            development notes, internal thinking, and the public-facing material
            around each release.
          </p>
          <p>
            The visual language stays restrained and monochrome so the work itself
            stays in focus while the structure remains scalable for future content.
          </p>
        </div>
      </section>

      <section className="contentSection documentsSection" id="documents">
        <div className="sectionHeading reveal revealRight" data-reveal>
          <span className="sectionIndex">03</span>
          <h2>Documents</h2>
        </div>

        <div className="infoGrid documentsGrid">
          {documentModules.map((item, index) => (
            <article
              key={item.title}
              className={`infoCard ${
                index === 0 ? "revealLeft" : index === 1 ? "revealFade" : "revealRight"
              }`}
              data-reveal
              style={{ "--reveal-delay": `${index * 0.1}s` } as CSSProperties}
            >
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="contentSection updatesSection" id="updates">
        <div className="sectionHeading reveal revealLeft" data-reveal>
          <span className="sectionIndex">04</span>
          <h2>Updates</h2>
        </div>

        <div className="infoGrid updatesGrid">
          {updateModules.map((item, index) => (
            <article
              key={item.title}
              className={`infoCard infoCardTall ${
                index === 0 ? "revealRight" : index === 1 ? "revealFade" : "revealLeft"
              }`}
              data-reveal
              style={{ "--reveal-delay": `${index * 0.1}s` } as CSSProperties}
            >
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="contentSection contactSection" id="contact">
        <div className="sectionHeading reveal revealRight" data-reveal>
          <span className="sectionIndex">05</span>
          <h2>Contact</h2>
        </div>

        <div className="contactPanel reveal revealFade" data-reveal>
          {contactModules.map((item, index) => (
            <article
              key={item.title}
              className={`contactModule ${
                index === 0 ? "revealLeft" : index === 1 ? "revealFade" : "revealRight"
              }`}
              data-reveal
              style={{ "--reveal-delay": `${index * 0.12}s` } as CSSProperties}
            >
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="siteFooter">
        <div className="footerCtaRow reveal revealFade" data-reveal>
          {footerCtas.map((item, index) => (
            <a
              key={item.title}
              href={item.href}
              target="_blank"
              rel="noreferrer"
              className={`footerCta ${
                index === 0 ? "revealLeft" : index === 1 ? "revealFade" : "revealRight"
              }`}
              data-reveal
              style={{ "--reveal-delay": `${index * 0.08}s` } as CSSProperties}
            >
              <span>{item.title}</span>
              <span className="footerArrow">↗</span>
            </a>
          ))}
        </div>

        <div className="footerLinks reveal revealFade" data-reveal>
          {footerColumns.map((column, index) => (
            <div
              key={column.title}
              className={`footerColumn ${
                index % 3 === 0 ? "revealLeft" : index % 3 === 1 ? "revealFade" : "revealRight"
              }`}
              data-reveal
              style={{ "--reveal-delay": `${index * 0.06}s` } as CSSProperties}
            >
              <h3>{column.title}</h3>
              <ul>
                {column.links.map((link) => (
                  <li key={link}>
                    <a href={githubUrl} target="_blank" rel="noreferrer">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="footerBottom reveal revealFade" data-reveal>
          <div className="footerSocials">
            <a href={githubUrl} target="_blank" rel="noreferrer">
              GitHub
            </a>
            <a href={githubUrl} target="_blank" rel="noreferrer">
              Steam
            </a>
            <a href={githubUrl} target="_blank" rel="noreferrer">
              Contact
            </a>
          </div>

          <div className="footerMeta">
            <p>© 2026 Hanazar Games. All rights reserved.</p>
            <div className="footerMetaLinks">
              <a href={githubUrl} target="_blank" rel="noreferrer">
                Privacy Policy
              </a>
              <a href={githubUrl} target="_blank" rel="noreferrer">
                Terms
              </a>
              <a href={githubUrl} target="_blank" rel="noreferrer">
                Links
              </a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
