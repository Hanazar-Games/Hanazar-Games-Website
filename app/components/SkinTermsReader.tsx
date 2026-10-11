"use client";

import { type FormEvent, type MouseEvent, useEffect, useRef, useState } from "react";
import { assetPath } from "../lib/paths";
import { documentClauseNumber, matchesDocumentQuery } from "../lib/documentSearch";
import { serviceTerms, serviceTermsSections as sections } from "../lib/skinServiceTerms";
import { clearTermsConsent, consentStorageKey, readTermsConsent, saveTermsConsent } from "../lib/skinTermsConsent";
import { skinText, type SkinServiceLanguage, type SkinTextKey } from "../lib/skinServiceI18n";

const FONT_MIN = 87.5;
const FONT_MAX = 200;
const FONT_STEP = 12.5;

function browserStorage() {
  try { return window.localStorage; } catch { return null; }
}

export default function SkinTermsReader({ language, onNavigate }: { language: SkinServiceLanguage; onNavigate: (targetId: string) => void }) {
  const [loaded, setLoaded] = useState(false);
  const [acceptedAt, setAcceptedAt] = useState<number | null>(null);
  const [read, setRead] = useState(false);
  const [risks, setRisks] = useState(false);
  const [notice, setNotice] = useState<SkinTextKey | null>(null);
  const [fontScale, setFontScale] = useState(100);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLDetailsElement>(null);
  const contentsRef = useRef<HTMLDetailsElement>(null);
  const pdfRef = useRef<HTMLDetailsElement>(null);
  const consentRef = useRef<HTMLFormElement>(null);

  const navigate = (event: MouseEvent<HTMLAnchorElement>, targetId: string, disclosure?: HTMLDetailsElement | null) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (disclosure) {
      disclosure.open = true;
      disclosure.querySelector("summary")?.focus({ preventScroll: true });
    }
    onNavigate(targetId);
  };

  useEffect(() => {
    setAcceptedAt(readTermsConsent(browserStorage()));
    setLoaded(true);
    const sync = (event: StorageEvent) => {
      if (event.key !== null && event.key !== consentStorageKey) return;
      if (event.storageArea !== browserStorage()) return;
      setAcceptedAt(readTermsConsent(browserStorage()));
      setRead(false);
      setRisks(false);
      setNotice(null);
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const confirm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!loaded || acceptedAt || !read || !risks) return;
    const now = Date.now();
    if (saveTermsConsent(browserStorage(), read, risks, now)) {
      setAcceptedAt(now);
      setNotice("termsSaved");
      consentRef.current?.focus({ preventScroll: true });
    } else {
      setNotice("termsSaveFailed");
    }
  };

  const clear = () => {
    if (!clearTermsConsent(browserStorage())) {
      setNotice("termsClearFailed");
      return;
    }
    setAcceptedAt(null);
    setRead(false);
    setRisks(false);
    setNotice("termsCleared");
    consentRef.current?.focus({ preventScroll: true });
  };
  const clauseNumber = documentClauseNumber(query);
  const searchResults = query.trim() ? sections.flatMap(section => section.clauses
    .filter(clause => clauseNumber !== null ? clause.number === clauseNumber : matchesDocumentQuery(`${section.title} ${clause.text}`, query, language))
    .map(clause => ({ ...clause, title: section.title }))) : [];

  return (
    <div className="skinTermsReader">
      <div className="skinTermsDocumentMeta">
        <div><h3 lang="zh-CN">{serviceTerms.title}</h3><p lang="zh-CN">{serviceTerms.subtitle}</p></div>
        <span>{serviceTerms.version} · {skinText(language, "termsPages", { count: serviceTerms.pageCount })}</span>
      </div>
      <p className="skinTermsLanguageNote">{skinText(language, "termsOriginalLanguage")}</p>
      <aside className="skinTermsImportant" lang="zh-CN" aria-labelledby="terms-important-title">
        <h3 id="terms-important-title">{serviceTerms.importantTitle}</h3>
        {serviceTerms.importantParagraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </aside>
      <div className="skinTermsDownloads">
        <a href={assetPath(serviceTerms.pdf)} target="_blank" rel="noopener noreferrer">{skinText(language, "termsOpenPdf")} ↗</a>
        <a href={assetPath(serviceTerms.pdf)} download>{skinText(language, "termsDownloadPdf")}</a>
        <a href={assetPath(serviceTerms.word)} download>{skinText(language, "termsDownloadWord")}</a>
      </div>
      <div className="skinTermsSearch">
        <label htmlFor="terms-search">{skinText(language, "termsSearchLabel")}</label>
        <div className="skinServiceSearchField">
          <input id="terms-search" ref={searchRef} type="search" maxLength={200} value={query}
            onChange={event => setQuery(event.target.value)} placeholder={skinText(language, "termsSearchPlaceholder")}
            aria-describedby="terms-search-help" aria-controls={query.trim() ? "terms-search-results" : undefined} />
          {query && <button type="button" aria-label={skinText(language, "termsSearchClear")} onClick={() => {
            setQuery("");
            searchRef.current?.focus();
          }}>{skinText(language, "clear")}</button>}
        </div>
        <p id="terms-search-help">{skinText(language, "termsSearchHelp")}</p>
        {query.trim() && <>
          <p className="skinTermsSearchStatus" role="status">{skinText(language, searchResults.length ? "termsSearchCount" : "termsSearchEmpty", { count: searchResults.length })}</p>
          <nav id="terms-search-results" className="skinTermsSearchResults" aria-label={skinText(language, "termsSearchResults")}>
            {searchResults.map(clause => <a href={`#${clause.id}`} key={clause.id} onClick={event => navigate(event, clause.id, textRef.current)}>
              <strong lang="zh-CN">{clause.title} · {clause.number}</strong>
              <span lang="zh-CN">{clause.text}</span>
            </a>)}
          </nav>
        </>}
      </div>
      <details className="skinTermsText" id="terms-full-text" ref={textRef} open suppressHydrationWarning>
        <summary>{skinText(language, "termsTextReader")}</summary>
        <nav className="skinTermsReadingNav" aria-label={skinText(language, "termsReadingNavigation")}>
          <a href="#terms-search" aria-label={skinText(language, "termsSearchLabel")} onClick={event => {
            if (!event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
              searchRef.current?.focus({ preventScroll: true });
              onNavigate("terms-search");
            }
          }}>{skinText(language, "termsJumpSearch")}</a>
          <a href="#terms-contents" aria-label={skinText(language, "termsContents")} onClick={event => navigate(event, "terms-contents", contentsRef.current)}>{skinText(language, "termsJumpContents")}</a>
          <a href="#terms-pdf" aria-label={skinText(language, "termsPdfReader")} onClick={event => navigate(event, "terms-pdf", pdfRef.current)}>{skinText(language, "termsJumpPdf")}</a>
          <a href="#terms-consent" aria-label={skinText(language, "termsConfirmTitle")} onClick={event => navigate(event, "terms-consent")}>{skinText(language, "termsJumpConfirm")}</a>
        </nav>
        <div className="skinTermsReadingTools">
          <p id="terms-readonly-note">{skinText(language, "termsReadonly")}</p>
          <div className="skinTermsFontControls" role="group" aria-label={skinText(language, "termsFontSize")}>
            <span>{skinText(language, "termsFontSize")}</span>
            <button type="button" aria-label={skinText(language, "termsFontDecrease")} aria-controls="terms-original-text" disabled={fontScale <= FONT_MIN} onClick={() => setFontScale((size) => Math.max(FONT_MIN, size - FONT_STEP))}>A−</button>
            <output aria-live="polite" aria-label={skinText(language, "termsFontSize")}>{fontScale}%</output>
            <button type="button" aria-label={skinText(language, "termsFontIncrease")} aria-controls="terms-original-text" disabled={fontScale >= FONT_MAX} onClick={() => setFontScale((size) => Math.min(FONT_MAX, size + FONT_STEP))}>A+</button>
            <button type="button" aria-label={skinText(language, "termsFontReset")} aria-controls="terms-original-text" disabled={fontScale === 100} onClick={() => setFontScale(100)}>{skinText(language, "termsFontReset")}</button>
          </div>
          <details className="skinTermsContents" id="terms-contents" ref={contentsRef} suppressHydrationWarning>
            <summary>{skinText(language, "termsContents")} · {skinText(language, "termsClauseCount", { count: sections.length })}</summary>
            <nav aria-label={skinText(language, "termsContents")}>
              <ul>
                {sections.map((section) => (
                  <li key={section.id}>
                    <details suppressHydrationWarning>
                      <summary lang="zh-CN">{section.title}</summary>
                      <a className="skinTermsSectionLink" href={`#${section.id}`} onClick={event => navigate(event, section.id)}>{skinText(language, "termsReadSection")}</a>
                      <ul>
                        {section.clauses.map((clause) => (
                          <li key={clause.id}><a href={`#${clause.id}`} lang="zh-CN" onClick={event => navigate(event, clause.id)}><span>{clause.number}</span><span>{clause.text.slice(clause.number.length).trim().slice(0, 24)}…</span></a></li>
                        ))}
                      </ul>
                    </details>
                  </li>
                ))}
              </ul>
            </nav>
          </details>
        </div>
        <article id="terms-original-text" lang="zh-CN" contentEditable={false} aria-describedby="terms-readonly-note" style={{ fontSize: `${fontScale / 100}rem` }}>
          <header><h3>{serviceTerms.title}</h3><p>{serviceTerms.subtitle}</p><p>{serviceTerms.revisionLine}</p></header>
          <h4>{serviceTerms.importantTitle}</h4>
          {serviceTerms.importantParagraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          {sections.map((section) => (
            <section id={section.id} key={section.id} tabIndex={-1}>
              <h4>{section.title}</h4>
              {section.clauses.map((clause) => <p id={clause.id} key={clause.id} tabIndex={-1}>{clause.text}</p>)}
            </section>
          ))}
        </article>
        <a className="skinTermsBackToContents" href="#terms-contents" onClick={event => navigate(event, "terms-contents", contentsRef.current)}>{skinText(language, "termsBackToContents")} ↑</a>
      </details>
      <details className="skinTermsPdf" id="terms-pdf" ref={pdfRef} suppressHydrationWarning>
        <summary>{skinText(language, "termsPdfReader")}</summary>
        <p>{skinText(language, "termsPdfFallback")} <a href="#terms-full-text" onClick={event => navigate(event, "terms-full-text", textRef.current)}>{skinText(language, "termsTextReader")}</a></p>
        <iframe
          src={`${assetPath(serviceTerms.pdf)}#view=FitH`}
          title={`${skinText(language, "termsPdfReader")} — ${serviceTerms.title}`}
          loading="lazy"
        />
      </details>
      <form className="skinTermsConsent" id="terms-consent" ref={consentRef} tabIndex={-1} onSubmit={confirm} aria-labelledby="terms-consent-title">
        <h3 id="terms-consent-title">{skinText(language, "termsConfirmTitle")}</h3>
        <p id="terms-consent-privacy">{skinText(language, "termsLocalOnly")}</p>
        <p>{skinText(language, "termsDeclineHint")}</p>
        <fieldset disabled={!loaded || acceptedAt !== null} aria-describedby="terms-consent-privacy">
          <legend className="visuallyHidden">{skinText(language, "termsConfirmTitle")}</legend>
          <label><input type="checkbox" checked={acceptedAt !== null || read} onChange={(event) => setRead(event.target.checked)} required />{skinText(language, "termsReadCheckbox", { version: serviceTerms.version })}</label>
          <label><input type="checkbox" checked={acceptedAt !== null || risks} onChange={(event) => setRisks(event.target.checked)} required />{skinText(language, "termsRiskCheckbox")}</label>
        </fieldset>
        {acceptedAt !== null && <p className="skinTermsAccepted">{skinText(language, "termsAccepted", { version: serviceTerms.version, time: new Date(acceptedAt).toLocaleString(language) })}</p>}
        <div className="skinTermsConsentActions">
          <button type="submit" disabled={!loaded || acceptedAt !== null || !read || !risks}>{skinText(language, acceptedAt !== null ? "termsConfirmed" : "termsConfirm")}</button>
          <button type="button" className="secondary" onClick={clear} disabled={!loaded || acceptedAt === null}>{skinText(language, "termsClear")}</button>
        </div>
        <p className="skinTermsStatus" role="status">{notice ? skinText(language, notice) : ""}</p>
        <noscript><p>{skinText(language, "termsNeedsJs")}</p></noscript>
      </form>
    </div>
  );
}
