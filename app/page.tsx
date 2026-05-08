"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import SettingsPanel from "./components/SettingsPanel";
import { useTranslation } from "./hooks/useTranslation";

const githubUrl = "https://github.com/hzagaming";
const heroBackdropImage = "/IntroPic.jpg";

const heroLinks = [
  { label: "navProducts", href: "#products" },
  { label: "navAbout", href: "#about" },
  { label: "navDocuments", href: "#documents" },
  { label: "navUpdates", href: "#updates" },
  { label: "navContact", href: "#contact" }
];

const productModules = [
  {
    title: "productFeaturedTitle",
    body: "productFeaturedBody",
    cta: "ctaViewGithub",
    href: githubUrl,
    icon: true
  },
  {
    title: "productWorldsTitle",
    body: "productWorldsBody",
    cta: "ctaPlayNow",
    href: "/games",
    icon: true
  },
  {
    title: "productConceptsTitle",
    body: "productConceptsBody",
    cta: "ctaViewGithub",
    href: githubUrl,
    icon: true
  }
];

const documentModules = [
  {
    title: "docDesignTitle",
    body: "docDesignBody"
  },
  {
    title: "docLoreTitle",
    body: "docLoreBody"
  },
  {
    title: "docVisualTitle",
    body: "docVisualBody"
  }
];

const updateModules = [
  {
    title: "updateDevlogTitle",
    body: "updateDevlogBody"
  },
  {
    title: "updateReleaseTitle",
    body: "updateReleaseBody"
  },
  {
    title: "updateNewsTitle",
    body: "updateNewsBody"
  }
];

const contactModules = [
  {
    title: "contactSteamTitle",
    body: "contactSteamBody"
  },
  {
    title: "contactBusinessTitle",
    body: "contactBusinessBody"
  },
  {
    title: "contactCommunityTitle",
    body: "contactCommunityBody"
  }
];

const footerCtas = [
  { title: "footerPlaySteam", href: githubUrl },
  { title: "footerViewProjects", href: githubUrl },
  { title: "footerContactStudio", href: githubUrl }
];

const footerColumns = [
  {
    title: "footerColumnGames",
    links: ["productFeaturedTitle", "footerWorldsChars", "productConceptsTitle", "footerUpcoming"]
  },
  {
    title: "footerColumnDocs",
    links: ["docDesignTitle", "docLoreTitle", "docVisualTitle", "footerInternalArchive"]
  },
  {
    title: "footerColumnUpdates",
    links: ["updateDevlogTitle", "updateReleaseTitle", "footerAnnouncements", "footerRoadmap"]
  },
  {
    title: "footerColumnStudio",
    links: ["sectionAbout", "navContact", "footerPressKit", "footerPartnerships"]
  },
  {
    title: "footerColumnSupport",
    links: ["footerSocialGithub", "footerSocialSteam", "contactCommunityTitle", "footerPrivacy"]
  }
];

export default function HomePage() {
  const [settingsOpen, setSettingsOpen] = useState(false);
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
          <span className="heroEyebrow">{tr("heroEyebrow")}</span>
          <h1 className="heroTitle">{tr("heroTitle")}</h1>
          <p className="heroSubtitle">
            {tr("heroSubtitle")}
          </p>

          <nav className="heroNav" aria-label={tr("ariaHomepageSections")}>
            {heroLinks.map((link, index) => (
              <a
                key={link.href}
                className="heroNavButton"
                href={link.href}
                style={{ "--button-index": index } as CSSProperties}
              >
                {tr(link.label)}
              </a>
            ))}
            <button
              className="heroNavButton"
              onClick={() => setSettingsOpen(true)}
              style={{ "--button-index": heroLinks.length } as CSSProperties}
              aria-label={tr("ariaOpenSettings")}
            >
              {tr("navSettings")}
            </button>
          </nav>

          <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        </div>
      </section>

      <section className="contentSection productsSection" id="products">
        <div className="sectionHeading reveal revealFade" data-reveal>
          <span className="sectionIndex">01</span>
          <h2>{tr("sectionProducts")}</h2>
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
              <h3>{tr(module.title)}</h3>
              <p>{tr(module.body)}</p>
              {module.href ? (
                module.href.startsWith("/") ? (
                  <Link className="moduleButton" href={module.href}>
                    {tr(module.cta)}
                  </Link>
                ) : (
                  <a
                    className="moduleButton"
                    href={module.href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {tr(module.cta)}
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
          <h2>{tr("sectionAbout")}</h2>
        </div>

        <div className="aboutPanel reveal revealRight" data-reveal>
          <p>{tr("aboutBody1")}</p>
          <p>{tr("aboutBody2")}</p>
          <p>{tr("aboutBody3")}</p>
        </div>
      </section>

      <section className="contentSection documentsSection" id="documents">
        <div className="sectionHeading reveal revealRight" data-reveal>
          <span className="sectionIndex">03</span>
          <h2>{tr("sectionDocuments")}</h2>
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
              <h3>{tr(item.title)}</h3>
              <p>{tr(item.body)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="contentSection updatesSection" id="updates">
        <div className="sectionHeading reveal revealLeft" data-reveal>
          <span className="sectionIndex">04</span>
          <h2>{tr("sectionUpdates")}</h2>
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
              <h3>{tr(item.title)}</h3>
              <p>{tr(item.body)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="contentSection contactSection" id="contact">
        <div className="sectionHeading reveal revealRight" data-reveal>
          <span className="sectionIndex">05</span>
          <h2>{tr("sectionContact")}</h2>
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
              <h3>{tr(item.title)}</h3>
              <p>{tr(item.body)}</p>
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
              <span>{tr(item.title)}</span>
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
              <h3>{tr(column.title)}</h3>
              <ul>
                {column.links.map((link) => (
                  <li key={link}>
                    <a href={githubUrl} target="_blank" rel="noreferrer">
                      {tr(link)}
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
              {tr("footerSocialGithub")}
            </a>
            <a href={githubUrl} target="_blank" rel="noreferrer">
              {tr("footerSocialSteam")}
            </a>
            <a href={githubUrl} target="_blank" rel="noreferrer">
              {tr("footerSocialContact")}
            </a>
          </div>

          <div className="footerMeta">
            <p>{tr("footerCopyright")}</p>
            <div className="footerMetaLinks">
              <a href={githubUrl} target="_blank" rel="noreferrer">
                {tr("footerPrivacy")}
              </a>
              <a href={githubUrl} target="_blank" rel="noreferrer">
                {tr("footerTerms")}
              </a>
              <a href={githubUrl} target="_blank" rel="noreferrer">
                {tr("footerLinks")}
              </a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
