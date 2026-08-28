"use client";

import type { CSSProperties } from "react";
import Image from "next/image";
import { useTranslation } from "./hooks/useTranslation";
import { useRevealOnScroll } from "./hooks/useRevealOnScroll";
import { aigcExperiments, homepageGames, homepageToolGroups } from "./lib/catalog";
import { assetPath } from "./lib/paths";

const githubUrl = "https://github.com/hzagaming";
const chatUrl = "chat/";
const transferUrl = "transfer/";
const heroBackdropImage = "/IntroPic.webp";

const heroLinks = [
  { label: "navGames", href: "#games" },
  { label: "navAigc", href: "#aigc" },
  { label: "navChat", href: chatUrl },
  { label: "navTransfer", href: transferUrl },
  { label: "navTools", href: "#tools" },
  { label: "navSkinService", href: "#skin-service" },
  { label: "navAbout", href: "#about" },
  { label: "navUpdates", href: "#updates" },
  { label: "navContact", href: "#contact" }
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
    title: "contactGamesTitle",
    body: "contactGamesBody",
    cta: "contactGamesCta",
    href: "#games"
  },
  {
    title: "contactBusinessTitle",
    body: "contactBusinessRealBody",
    cta: "contactEmailCta",
    href: "mailto:hanazar@mirako.co"
  },
  {
    title: "contactCommunityTitle",
    body: "contactCommunityRealBody",
    cta: "contactGithubCta",
    href: githubUrl
  }
];

const footerCtas = [
  { title: "footerExploreGames", href: "#games" },
  { title: "footerViewProjects", href: githubUrl },
  { title: "footerContactStudio", href: "mailto:hanazar@mirako.co" }
];

const footerColumns = [
  {
    title: "footerColumnTools",
    links: [
      { title: "toolOcMakerTitle", href: "https://hzagaming.github.io/Original-Character-Maker/" },
      { title: "toolClipoTitle", href: "https://github.com/hzagaming/Clipo" },
      { title: "toolClassGodTitle", href: "https://github.com/hzagaming/ClassGod" },
      { title: "toolTransferTitle", href: "https://hzagaming.github.io/HanazarTransfer/" },
      { title: "toolHeptTitle", href: "https://github.com/hzagaming/Hept/releases" },
      { title: "toolListenerTitle", href: "https://hzagaming.github.io/LIstener" },
      { title: "productLc300aTitle", href: "https://github.com/hzagaming/LC300A" }
    ]
  },
  {
    title: "footerColumnDocs",
    links: ["docDesignTitle", "docLoreTitle", "docVisualTitle", "footerInternalArchive"].map(
      (title) => ({ title, href: "#documents" })
    )
  },
  {
    title: "footerColumnUpdates",
    links: ["updateDevlogTitle", "updateReleaseTitle", "footerAnnouncements", "footerRoadmap"].map(
      (title) => ({ title, href: "#updates" })
    )
  },
  {
    title: "footerColumnStudio",
    links: [
      { title: "sectionAbout", href: "#about" },
      { title: "navContact", href: "#contact" },
      { title: "footerPressKit", href: "mailto:hanazar@mirako.co" },
      { title: "footerPartnerships", href: "mailto:hanazar@mirako.co" }
    ]
  },
  {
    title: "footerColumnSupport",
    links: [
      { title: "footerSocialGithub", href: githubUrl },
      { title: "gamesHeroTitle", href: "games/" },
      { title: "navAigc", href: "aigc/" },
      { title: "sectionTools", href: "tools/" },
      { title: "navChat", href: chatUrl },
      { title: "navTransfer", href: transferUrl },
      { title: "navContact", href: "mailto:hanazar@mirako.co" }
    ]
  }
];

export default function HomePage() {
  const { tr } = useTranslation();

  useRevealOnScroll();

  return (
    <main className="pageShell">
      <section className="heroSection">
        <div className="heroBackdrop" aria-hidden="true">
          <div className="heroImageLayer">
            <Image
              src={assetPath(heroBackdropImage)}
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
                target={link.href.startsWith("http") ? "_blank" : undefined}
                rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                style={{ "--button-index": index } as CSSProperties}
              >
                {tr(link.label)}
              </a>
            ))}
            <button
              className="heroNavButton"
              type="button"
              onClick={() => window.dispatchEvent(new Event("hanazar:open-settings"))}
              style={{ "--button-index": heroLinks.length } as CSSProperties}
              aria-label={tr("ariaOpenSettings")}
              aria-haspopup="dialog"
            >
              {tr("navSettings")}
            </button>
          </nav>
        </div>
      </section>

      <section className="contentSection homepageGamesSection" id="games">
        <div className="sectionHeading reveal revealFade" data-reveal>
          <span className="sectionIndex">01</span>
          <h2>{tr("gamesHeroTitle")}</h2>
        </div>

        <div className="sectionIntro reveal revealFade" data-reveal>
          <p>{tr("gamesHeroSubtitle")}</p>
          <a className="sectionTextLink" href="games/">
            {tr("gamesBrowseAll")} <span aria-hidden="true">→</span>
          </a>
        </div>

        <div className="gamesGrid homepageGamesGrid">
          {homepageGames.map((game, index) => (
            <article
              key={game.title}
              className={`gameCard ${index % 2 === 0 ? "revealLeft" : "revealRight"}`}
              data-reveal
              style={{ "--reveal-delay": `${(index % 2) * 0.06}s` } as CSSProperties}
            >
              <div className="gameCardImageWrap">
                <Image
                  src={assetPath(game.image)}
                  alt={tr(game.title)}
                  className="gameCardImage"
                  width={1280}
                  height={720}
                  sizes="(max-width: 800px) 100vw, 50vw"
                />
              </div>
              <div className="gameCardBody">
                <span className="gameCardTag">{tr(game.tag)}</span>
                <h3>{tr(game.title)}</h3>
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
      </section>

      <section className="contentSection homepageAigcSection" id="aigc">
        <div className="sectionHeading reveal revealFade" data-reveal>
          <span className="sectionIndex">02</span>
          <h2>{tr("aigcHeroTitle")}</h2>
        </div>

        <div className="sectionIntro reveal revealFade" data-reveal>
          <p>{tr("aigcHeroSubtitle")}</p>
          <a className="sectionTextLink" href="aigc/">
            {tr("ctaExploreAigc")} <span aria-hidden="true">→</span>
          </a>
        </div>

        <div className="gamesGrid homepageAigcGrid">
          {aigcExperiments.map((experiment, index) => (
            <article
              key={experiment.title}
              className={`gameCard ${index % 2 === 0 ? "revealLeft" : "revealRight"}`}
              data-reveal
              style={{ "--reveal-delay": `${(index % 2) * 0.06}s` } as CSSProperties}
            >
              <div className="gameCardImageWrap">
                <Image
                  src={assetPath(experiment.image)}
                  alt={tr(experiment.title)}
                  className="gameCardImage"
                  width={1280}
                  height={720}
                  sizes="(max-width: 800px) 100vw, 50vw"
                />
              </div>
              <div className="gameCardBody">
                <span className="gameCardTag">{tr(experiment.tag)}</span>
                <h3>{tr(experiment.title)}</h3>
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
      </section>

      <section className="contentSection toolsSection" id="tools">
        <div className="sectionHeading reveal revealFade" data-reveal>
          <span className="sectionIndex">03</span>
          <h2>{tr("sectionTools")}</h2>
          <a className="sectionTextLink sectionHeadingLink" href="tools/">
            {tr("toolsBrowseAll")} <span aria-hidden="true">→</span>
          </a>
        </div>

        <div className="toolsGroups">
          {homepageToolGroups.map((group, groupIndex) => (
            <div className="toolsGroup" key={group.title}>
              <div
                className={`toolsGroupHeading ${
                  groupIndex % 3 === 0
                    ? "revealLeft"
                    : groupIndex % 3 === 1
                      ? "revealFade"
                      : "revealRight"
                }`}
                data-reveal
              >
                <div>
                  <span className="toolsGroupLabel">{tr(group.label)}</span>
                  <h3>{tr(group.title)}</h3>
                </div>
                <span className="toolsGroupCount">{String(group.tools.length).padStart(2, "0")}</span>
              </div>

              <div className={`toolsGrid${
                  group.tools.length === 1
                    ? " toolsGridSingle"
                    : group.tools.length === 2
                        ? " toolsGridMac"
                        : ""
              }`}>
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
                    style={{
                      "--reveal-delay": `${(index % 3) * 0.06}s`
                    } as CSSProperties}
                  >
                    <div className="gameCardImageWrap">
                      <Image
                        src={assetPath(tool.image)}
                        alt={tr(tool.title)}
                        className="gameCardImage"
                        width={1280}
                        height={720}
                        sizes={group.tools.length === 1
                          ? "(max-width: 980px) 100vw, 54vw"
                          : group.tools.length % 2 === 0
                            ? "(max-width: 800px) 100vw, 50vw"
                            : "(max-width: 800px) 100vw, (max-width: 980px) 50vw, 33vw"}
                      />
                    </div>
                    <div className="gameCardBody">
                      <span className="gameCardTag">{tr(tool.tag)}</span>
                      <h4>{tr(tool.title)}</h4>
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
            </div>
          ))}
        </div>
      </section>

      <section className="contentSection skinServiceSection" id="skin-service">
        <div className="sectionHeading reveal revealFade" data-reveal>
          <span className="sectionIndex">04</span>
          <h2>{tr("skinServiceTitle")}</h2>
        </div>

        <a className="skinServiceFeature reveal revealFade" href="skin-service/" data-reveal>
          <span className="skinServiceFeatureLabel">{tr("skinServiceEyebrow")}</span>
          <h3>{tr("skinServiceTitle")}</h3>
          <span className="skinServiceFeatureCta">
            {tr("skinServiceOpen")} <span aria-hidden="true">→</span>
          </span>
        </a>
      </section>

      <section className="contentSection aboutSection" id="about">
        <div className="sectionHeading reveal revealLeft" data-reveal>
          <span className="sectionIndex">05</span>
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
          <span className="sectionIndex">06</span>
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
          <span className="sectionIndex">07</span>
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
          <span className="sectionIndex">08</span>
          <h2>{tr("sectionContact")}</h2>
        </div>

        <div className="contactPanel reveal revealFade" data-reveal>
          {contactModules.map((item, index) => (
            <a
              key={item.title}
              href={item.href}
              target={item.href.startsWith("http") ? "_blank" : undefined}
              rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
              className={`contactModule ${
                index === 0 ? "revealLeft" : index === 1 ? "revealFade" : "revealRight"
              }`}
              data-reveal
              style={{ "--reveal-delay": `${index * 0.12}s` } as CSSProperties}
            >
              <h3>{tr(item.title)}</h3>
              <p>{tr(item.body)}</p>
              <span className="contactModuleCta">
                {tr(item.cta)} <span aria-hidden="true">{item.href.startsWith("http") ? "↗" : "→"}</span>
              </span>
            </a>
          ))}
        </div>
      </section>

      <footer className="siteFooter">
        <div className="footerCtaRow reveal revealFade" data-reveal>
          {footerCtas.map((item, index) => (
            <a
              key={item.title}
              href={item.href}
              target={item.href.startsWith("http") ? "_blank" : undefined}
              rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
              className={`footerCta ${
                index === 0 ? "revealLeft" : index === 1 ? "revealFade" : "revealRight"
              }`}
              data-reveal
              style={{ "--reveal-delay": `${index * 0.08}s` } as CSSProperties}
            >
              <span>{tr(item.title)}</span>
              <span className="footerArrow" aria-hidden="true">
                {item.href.startsWith("http") ? "↗" : "→"}
              </span>
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
                  <li key={link.title}>
                    <a
                      href={link.href}
                      target={link.href.startsWith("http") ? "_blank" : undefined}
                      rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                    >
                      {tr(link.title)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="footerBottom reveal revealFade" data-reveal>
          <div className="footerSocials">
            <a href={githubUrl} target="_blank" rel="noopener noreferrer">
              {tr("footerSocialGithub")}
            </a>
            <a href="games/">
              {tr("gamesHeroTitle")}
            </a>
            <a href={chatUrl}>
              {tr("navChat")}
            </a>
            <a href={transferUrl}>
              {tr("navTransfer")}
            </a>
            <a href="mailto:hanazar@mirako.co">
              {tr("footerSocialContact")}
            </a>
          </div>

          <div className="footerMeta">
            <p>{tr("footerCopyright")}</p>
            <div className="footerMetaLinks">
              <a href="#about">
                {tr("sectionAbout")}
              </a>
              <a href="mailto:hanazar@mirako.co">
                {tr("navContact")}
              </a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
