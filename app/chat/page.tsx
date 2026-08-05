"use client";

import Link from "next/link";
import { useTranslation } from "../hooks/useTranslation";
import { useRevealOnScroll } from "../hooks/useRevealOnScroll";

const deploymentGuide = "https://github.com/Hanazar-Games/Hanazar-Games-Website/tree/main/chat";

function configuredServiceUrl() {
  const value = process.env.NEXT_PUBLIC_CHAT_SERVICE_URL?.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

export default function ChatStatusPage() {
  const { tr } = useTranslation();
  const serviceUrl = configuredServiceUrl();
  const ready = serviceUrl !== null;

  useRevealOnScroll();

  return (
    <main className="pageShell gamesShell chatStatusShell">
      <section className="gamesHero chatStatusHero">
        <Link href="/" className="gamesHeroBack">
          {tr("gamesBackHome")}
        </Link>
        <div className="gamesHeroInner chatStatusHeroInner">
          <span className="gamesHeroEyebrow">{tr("chatStatusEyebrow")}</span>
          <div className={`chatStatusBadge${ready ? " ready" : ""}`} role="status">
            <span aria-hidden="true" />
            {tr(ready ? "chatStatusReady" : "chatStatusPending")}
          </div>
          <h1 className="gamesHeroTitle">{tr("chatStatusTitle")}</h1>
          <p className="gamesHeroSubtitle">
            {tr(ready ? "chatStatusReadyBody" : "chatStatusPendingBody")}
          </p>
        </div>
      </section>

      <section className="chatStatusContent" aria-label={tr("chatStatusTitle")}>
        <div className="chatStatusGrid">
          <article className="chatStatusCard revealLeft" data-reveal>
            <span className="chatStatusIndex">01</span>
            <h2>{tr("chatStatusEntryTitle")}</h2>
            <strong className="chatStatusOnline">{tr("chatStatusOnline")}</strong>
            <p>{tr("chatStatusEntryBody")}</p>
          </article>
          <article className="chatStatusCard revealRight" data-reveal>
            <span className="chatStatusIndex">02</span>
            <h2>{tr("chatStatusBackendTitle")}</h2>
            <strong className={ready ? "chatStatusOnline" : "chatStatusWaiting"}>
              {tr(ready ? "chatStatusOnline" : "chatStatusWaiting")}
            </strong>
            <p>{tr(ready ? "chatStatusBackendReady" : "chatStatusBackendPending")}</p>
          </article>
        </div>

        <div className="chatStatusActions reveal revealFade" data-reveal>
          {serviceUrl ? (
            <a className="chatStatusPrimary" href={serviceUrl} target="_blank" rel="noopener noreferrer">
              {tr("chatStatusOpen")}
              <span aria-hidden="true">↗</span>
            </a>
          ) : null}
          <a className="chatStatusSecondary" href={deploymentGuide} target="_blank" rel="noopener noreferrer">
            {tr("chatStatusGuide")}
            <span aria-hidden="true">↗</span>
          </a>
        </div>
        <p className="chatStatusNote reveal revealFade" data-reveal>{tr("chatStatusNote")}</p>
      </section>
    </main>
  );
}
