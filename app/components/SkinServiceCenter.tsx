"use client";

import Link from "next/link";
import Image from "next/image";
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSettingsContext } from "./SettingsContext";
import { assetPath } from "../lib/paths";
import {
  skinServiceLanguage,
  skinText,
  type SkinServiceLanguage,
  type SkinTextKey,
} from "../lib/skinServiceI18n";

interface FeedbackItem {
  id: number;
  content: string;
  createdAt: number;
  updatedAt: number;
  publishAt: number;
}

interface PendingFeedback {
  id: number;
  content: string;
  editToken: string;
  expiresAt: number;
}

interface ApiEnvelope {
  ok: boolean;
  data: unknown;
  error: { code?: unknown } | null;
}

type WallState = "loading" | "ready" | "unavailable" | "failed";
type ArticleCategoryId = "introduction" | "preparation" | "review" | "privacy";
type ArticleCategory = "all" | ArticleCategoryId;
type SectionIconName = "communities" | "questions" | "feedback" | "notices" | "support";

const EDIT_WINDOW_MS = 5 * 60 * 1000;
const WALL_PAGE_SIZE = 20;
const MAX_UNIX_SECONDS = Math.floor(8.64e15 / 1000);
const STORAGE_KEY = "hanazar.skin-feedback-edit.v1";
const COMMUNITY_PROMPT_STORAGE_KEY = "hanazar.skin-service-community-prompt.v1";
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

const sectionDefinitions: Array<{
  id: string;
  icon: SectionIconName;
  tone: string;
  title: SkinTextKey;
  summary: SkinTextKey;
}> = [
  { id: "communities", icon: "communities", tone: "violet", title: "communitiesTitle", summary: "communitiesSummary" },
  { id: "questions", icon: "questions", tone: "cyan", title: "questionsTitle", summary: "questionsSummary" },
  { id: "feedback", icon: "feedback", tone: "coral", title: "feedbackTitle", summary: "feedbackSummary" },
  { id: "review-notices", icon: "notices", tone: "amber", title: "noticesTitle", summary: "noticesSummary" },
  { id: "support", icon: "support", tone: "emerald", title: "supportTitle", summary: "supportSummary" },
];

const communityDefinitions: Array<{
  name: SkinTextKey;
  kind: SkinTextKey;
  image?: string;
  value?: string;
  href?: string;
}> = [
  { name: "group2", kind: "wechat", image: "/skin-service/groups/group-2.jpg" },
  { name: "group3", kind: "qqGroup", value: "939095145" },
  { name: "group4", kind: "wechat", image: "/skin-service/groups/group-4.jpg" },
  { name: "group5", kind: "voiceCommunity", href: "https://discord.gg/XtTbKCSKa" },
  { name: "group6", kind: "qqGroup", value: "853878672" },
  { name: "group7", kind: "wechat", image: "/skin-service/groups/group-7.jpg" },
  { name: "group8", kind: "qqGroup", value: "953014293" },
  { name: "group9", kind: "wechat", image: "/skin-service/groups/group-9.jpg" },
  { name: "group10", kind: "qqGroup", value: "1105843703" },
];

const articleCategoryDefinitions: Array<{ id: ArticleCategory; title: SkinTextKey }> = [
  { id: "all", title: "allArticles" },
  { id: "introduction", title: "serviceIntro" },
  { id: "preparation", title: "materials" },
  { id: "review", title: "reviewHandling" },
  { id: "privacy", title: "privacySafety" },
];

const articleDefinitions: Array<{
  id: string;
  category: ArticleCategoryId;
  title: SkinTextKey;
  content: SkinTextKey;
}> = [
  { id: "service-introduction", category: "introduction", title: "article1Title", content: "article1Body" },
  { id: "submission-preparation", category: "preparation", title: "article2Title", content: "article2Body" },
  { id: "review-status", category: "review", title: "article3Title", content: "article3Body" },
  { id: "returned-materials", category: "review", title: "article4Title", content: "article4Body" },
  { id: "change-submission", category: "review", title: "article5Title", content: "article5Body" },
  { id: "privacy-protection", category: "privacy", title: "article6Title", content: "article6Body" },
];

function SectionIcon({ name }: { name: SectionIconName }) {
  const paths = {
    communities: <><circle cx="8" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M2.8 20c.5-4.2 2.4-6.3 5.2-6.3s4.8 2.1 5.2 6.3M14.2 14.1c3.8-.7 6.3 1.2 6.9 5" /></>,
    questions: <><path d="M6 3.5h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2Z" /><path d="M9.4 9a2.7 2.7 0 1 1 4.1 2.3c-1 .6-1.5 1.1-1.5 2.2M12 16.8h.01" /></>,
    feedback: <><path d="M4 5.5h16v11H9l-5 4v-15Z" /><path d="m15.8 3 .5 1.4 1.4.5-1.4.5-.5 1.4-.5-1.4-1.4-.5 1.4-.5.5-1.4Z" /></>,
    notices: <><path d="M6.5 17.5h11l-1.4-2.1V10a4.1 4.1 0 0 0-8.2 0v5.4l-1.4 2.1Z" /><path d="M10 20.2h4M12 3V1.8M4.8 5.2 3.9 4.3M19.2 5.2l.9-.9" /></>,
    support: <><path d="M12 20S4 15.5 4 9.4A4.1 4.1 0 0 1 11.2 6L12 7l.8-1A4.1 4.1 0 0 1 20 9.4C20 15.5 12 20 12 20Z" /><path d="M8.6 12h2l1-2.2 1.5 4.2 1-2h1.5" /></>,
  } satisfies Record<SectionIconName, React.ReactNode>;

  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

function SectionHeader({ icon, title, description }: { icon: SectionIconName; title: string; description: string }) {
  return (
    <header className="skinServiceSectionHeader">
      <span className="skinServiceSectionIcon" aria-hidden="true"><SectionIcon name={icon} /></span>
      <div><h2>{title}</h2><p>{description}</p></div>
    </header>
  );
}

class FeedbackRequestError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseFeedback(value: unknown): FeedbackItem | null {
  if (!isRecord(value)) return null;
  const { id, content, created_at: createdAt, updated_at: updatedAt, publish_at: publishAt } = value;
  if (
    typeof id !== "number"
    || !Number.isSafeInteger(id)
    || id < 1
    || typeof content !== "string"
    || Array.from(content).length < 4
    || Array.from(content).length > 500
    || typeof createdAt !== "number"
    || !Number.isSafeInteger(createdAt)
    || createdAt < 0
    || createdAt > MAX_UNIX_SECONDS
    || typeof updatedAt !== "number"
    || !Number.isSafeInteger(updatedAt)
    || updatedAt < createdAt
    || updatedAt > MAX_UNIX_SECONDS
    || typeof publishAt !== "number"
    || !Number.isSafeInteger(publishAt)
    || publishAt < createdAt
    || publishAt > MAX_UNIX_SECONDS
  ) return null;
  return { id, content, createdAt, updatedAt, publishAt };
}

function parseFeedbackPage(value: unknown, beforeId?: number) {
  if (!isRecord(value) || !Array.isArray(value.items) || value.items.length > WALL_PAGE_SIZE) return null;
  const parsed = value.items.map(parseFeedback);
  if (parsed.some((item) => item === null)) return null;
  const items = parsed as FeedbackItem[];
  if (items.some((item, index) => (
    (index > 0 && items[index - 1].id <= item.id)
    || (beforeId !== undefined && item.id >= beforeId)
  ))) return null;

  const nextCursor = value.next_cursor;
  if (nextCursor !== null && (
    typeof nextCursor !== "number"
    || !Number.isSafeInteger(nextCursor)
    || nextCursor < 1
    || items.length === 0
    || nextCursor !== items[items.length - 1].id
  )) return null;

  return { items, nextCursor: nextCursor as number | null };
}

function parsePending(value: unknown, now: number): PendingFeedback | null {
  if (!isRecord(value)) return null;
  const { id, content, editToken, expiresAt } = value;
  if (
    typeof id !== "number"
    || !Number.isSafeInteger(id)
    || id < 1
    || typeof content !== "string"
    || Array.from(content).length < 4
    || Array.from(content).length > 500
    || typeof editToken !== "string"
    || !TOKEN_PATTERN.test(editToken)
    || typeof expiresAt !== "number"
    || !Number.isSafeInteger(expiresAt)
    || expiresAt <= now
    || expiresAt > now + EDIT_WINDOW_MS + 60_000
  ) return null;
  return { id, content, editToken, expiresAt };
}

function loadPending(now: number) {
  try {
    return parsePending(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as unknown, now);
  } catch {
    return null;
  }
}

function persistPending(pending: PendingFeedback | null) {
  try {
    if (pending) localStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // The current tab can still edit while storage is unavailable.
  }
}

function feedbackEndpoint(serviceUrl: string, suffix = "") {
  return new URL(`api/feedbacks${suffix}`, serviceUrl).href;
}

async function feedbackRequest(serviceUrl: string, suffix: string, init: RequestInit, signal?: AbortSignal) {
  let response: Response;
  try {
    response = await fetch(feedbackEndpoint(serviceUrl, suffix), {
      ...init,
      signal,
      cache: "no-store",
      credentials: "omit",
      referrerPolicy: "no-referrer",
      headers: { Accept: "application/json", ...init.headers },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new FeedbackRequestError("service_unavailable");
  }

  let envelope: ApiEnvelope | null = null;
  try {
    envelope = await response.json() as ApiEnvelope;
  } catch {
    throw new FeedbackRequestError("invalid_response");
  }
  if (!response.ok || !envelope || envelope.ok !== true) {
    throw new FeedbackRequestError(typeof envelope?.error?.code === "string" ? envelope.error.code : "request_failed");
  }
  return envelope.data;
}

function errorMessage(error: unknown, language: SkinServiceLanguage) {
  if (!(error instanceof FeedbackRequestError)) return skinText(language, "genericFailure");
  const keys: Record<string, SkinTextKey> = {
    edit_window_closed: "errorEditClosed",
    duplicate_feedback: "errorDuplicate",
    invalid_feedback: "errorInvalid",
    feedback_not_found: "errorNotFound",
    service_unavailable: "errorUnavailable",
    invalid_response: "errorResponse",
    rate_limit_exceeded: "errorRateLimit",
  };
  return skinText(language, keys[error.code] ?? "genericFailure");
}

function formatCountdown(milliseconds: number, language: SkinServiceLanguage) {
  const total = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  if (language === "en") return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  return `${minutes}分${String(seconds).padStart(2, "0")}秒`;
}

function formatDate(unixSeconds: number, language: SkinServiceLanguage) {
  return new Intl.DateTimeFormat(language, { dateStyle: "medium", timeStyle: "short" }).format(unixSeconds * 1000);
}

function scrollBehavior(reduceAnimations: boolean): ScrollBehavior {
  return reduceAnimations || window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
}

export default function SkinServiceCenter({ serviceUrl }: { serviceUrl: string | null }) {
  const { settings, update } = useSettingsContext();
  const language = skinServiceLanguage(settings.language);
  const [query, setQuery] = useState("");
  const [activeArticleCategory, setActiveArticleCategory] = useState<ArticleCategory>("all");
  const [communityPromptOpen, setCommunityPromptOpen] = useState(false);
  const [communityNotice, setCommunityNotice] = useState("");
  const [wall, setWall] = useState<FeedbackItem[]>([]);
  const [wallState, setWallState] = useState<WallState>(serviceUrl ? "loading" : "unavailable");
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [wallNotice, setWallNotice] = useState("");
  const [pending, setPending] = useState<PendingFeedback | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [content, setContent] = useState("");
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState("");
  const [now, setNow] = useState(Date.now());
  const wallRequestRef = useRef<AbortController | null>(null);
  const wallExpandedRef = useRef(false);
  const communityPromptDialogRef = useRef<HTMLDivElement | null>(null);
  const communityPromptViewRef = useRef<HTMLButtonElement | null>(null);
  const communityPromptPreviousFocusRef = useRef<HTMLElement | null>(null);
  const sections = sectionDefinitions.map((section) => ({
    ...section,
    title: skinText(language, section.title),
    summary: skinText(language, section.summary),
  }));
  const communities = communityDefinitions.map((community) => ({
    ...community,
    name: skinText(language, community.name),
    kind: skinText(language, community.kind),
  }));
  const articleCategories = articleCategoryDefinitions.map((category) => ({
    ...category,
    title: skinText(language, category.title),
  }));
  const articles = articleDefinitions.map((article) => ({
    ...article,
    title: skinText(language, article.title),
    content: skinText(language, article.content),
  }));
  const wechatCommunities = communities.filter((community) => community.image);
  const otherCommunities = communities.filter((community) => !community.image);
  const reduceAnimations = settings.reduceAnimations || !settings.animationsEnabled;

  const dismissCommunityPrompt = useCallback((showCommunities: boolean) => {
    try {
      localStorage.setItem(COMMUNITY_PROMPT_STORAGE_KEY, "1");
    } catch {
      // The prompt still stays closed for the current page session.
    }
    setCommunityPromptOpen(false);
    if (!showCommunities) return;
    window.setTimeout(() => {
      const communitiesSection = document.getElementById("communities");
      communitiesSection?.scrollIntoView({ behavior: scrollBehavior(reduceAnimations), block: "start" });
      communitiesSection?.focus({ preventScroll: true });
      window.history.replaceState(null, "", "#communities");
    }, 0);
  }, [reduceAnimations]);

  useEffect(() => {
    if (settings.language !== language) update("language", language);
  }, [language, settings.language, update]);

  useEffect(() => {
    try {
      if (localStorage.getItem(COMMUNITY_PROMPT_STORAGE_KEY) !== "1") {
        setCommunityPromptOpen(true);
      }
    } catch {
      setCommunityPromptOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!communityPromptOpen) return;
    const body = document.body;
    const previousOverflow = body.style.overflow;
    communityPromptPreviousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => communityPromptViewRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        dismissCommunityPrompt(false);
        return;
      }
      if (event.key !== "Tab" || !communityPromptDialogRef.current) return;
      const buttons = Array.from(
        communityPromptDialogRef.current.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"),
      );
      if (buttons.length === 0) return;
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
      body.style.overflow = previousOverflow;
      if (communityPromptPreviousFocusRef.current?.isConnected) {
        communityPromptPreviousFocusRef.current.focus({ preventScroll: true });
      }
    };
  }, [communityPromptOpen, dismissCommunityPrompt]);

  const refreshWall = useCallback(async (beforeId?: number) => {
    const append = beforeId !== undefined;
    wallRequestRef.current?.abort();
    if (!serviceUrl) {
      setWallState("unavailable");
      return;
    }
    if (append) setLoadingMore(true);
    else {
      setLoadingMore(false);
      setWallNotice("");
      wallExpandedRef.current = false;
    }
    const controller = new AbortController();
    wallRequestRef.current = controller;
    try {
      const cursor = append ? `&before_id=${beforeId}` : "";
      const data = await feedbackRequest(serviceUrl, `?limit=${WALL_PAGE_SIZE}${cursor}`, { method: "GET" }, controller.signal);
      const page = parseFeedbackPage(data, beforeId);
      if (!page) throw new FeedbackRequestError("invalid_response");
      if (wallRequestRef.current !== controller) return;
      setWall((current) => append ? [...current, ...page.items] : page.items);
      setNextCursor(page.nextCursor);
      setWallNotice("");
      if (append) wallExpandedRef.current = true;
      setWallState("ready");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (wallRequestRef.current !== controller) return;
      if (append) setWallNotice(skinText(language, "moreFailed"));
      else setWallState("failed");
    } finally {
      if (wallRequestRef.current === controller) {
        wallRequestRef.current = null;
        setLoadingMore(false);
      }
    }
  }, [language, serviceUrl]);

  useEffect(() => {
    const saved = loadPending(Date.now());
    if (saved) {
      setPending(saved);
      setEditingId(saved.id);
      setContent(saved.content);
    } else {
      persistPending(null);
    }
  }, []);

  useEffect(() => {
    void refreshWall();
    const refreshWhenVisible = () => {
      if (!document.hidden && !wallExpandedRef.current) void refreshWall();
    };
    const timer = window.setInterval(refreshWhenVisible, 30_000);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      wallRequestRef.current?.abort();
      wallRequestRef.current = null;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [refreshWall]);

  useEffect(() => {
    if (!pending) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [pending]);

  useEffect(() => {
    if (!pending || now < pending.expiresAt) return;
    persistPending(null);
    setPending(null);
    setEditingId(null);
    setContent("");
    setFeedbackNotice(skinText(language, "editExpired"));
    void refreshWall();
  }, [language, now, pending, refreshWall]);

  const searchResults = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(language);
    if (!normalized) return [];
    const entries = [
      ...sections.map((section) => ({ title: section.title, text: section.summary, href: `#${section.id}` })),
      ...communities.map((community) => ({
        title: `${community.name} · ${community.kind}`,
        text: community.value ?? (community.image ? skinText(language, "qrAvailable") : community.kind),
        href: "#communities",
      })),
      ...articles.map((article) => ({
        title: article.title,
        text: `${articleCategories.find((category) => category.id === article.category)?.title ?? ""} ${article.content}`,
        href: `#${article.id}`,
      })),
      ...wall.map((item) => ({ title: skinText(language, "publicFeedbackSearch"), text: item.content, href: `#feedback-${item.id}` })),
    ];
    return entries.filter((entry) => `${entry.title} ${entry.text}`.toLocaleLowerCase(language).includes(normalized)).slice(0, 20);
  }, [language, query, wall]);

  const visibleArticles = activeArticleCategory === "all"
    ? articles
    : articles.filter((article) => article.category === activeArticleCategory);

  const copyGroup = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCommunityNotice(skinText(language, "copiedGroup", { value }));
    } catch {
      setCommunityNotice(skinText(language, "copyFailed", { value }));
    }
  };

  const renderCommunityCard = (community: typeof communities[number]) => (
    <article className={`skinCommunityCard${community.image ? " skinCommunityCardQr" : ""}`} key={community.name}>
      <div><span>{community.kind}</span><h4>{community.name}</h4></div>
      {community.image && (
        <>
          <div className="skinCommunityQr">
            <Image
              className="skinCommunityQrImage"
              src={assetPath(community.image)}
              alt={skinText(language, "qrImageAlt", { group: community.name })}
              width={1050}
              height={1566}
              sizes="(max-width: 480px) calc(100vw - 90px), (max-width: 800px) calc(50vw - 54px), 270px"
            />
          </div>
          <small className="skinCommunityQrHint">{skinText(language, "scanQrHint")}</small>
        </>
      )}
      {community.value && (
        <>
          <code>{community.value}</code>
          <button type="button" onClick={() => void copyGroup(community.value!)}>{skinText(language, "copyGroup")}</button>
        </>
      )}
      {community.href && (
        <a href={community.href} target="_blank" rel="noopener noreferrer">{skinText(language, "openGroup5")}</a>
      )}
    </article>
  );

  const submitFeedback = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = content.trim();
    const length = Array.from(normalized).length;
    if (!serviceUrl) {
      setFeedbackNotice(skinText(language, "serviceUnconfiguredSubmit"));
      return;
    }
    if (length < 4 || length > 500) {
      setFeedbackNotice(skinText(language, "feedbackLength"));
      return;
    }
    if (editingId && (!pending || pending.id !== editingId)) {
      setFeedbackNotice(skinText(language, "credentialExpired"));
      return;
    }

    setSubmitting(true);
    setFeedbackNotice("");
    try {
      const data = await feedbackRequest(serviceUrl, editingId ? `/${editingId}` : "", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: normalized,
          website,
          ...(editingId && pending ? { edit_token: pending.editToken } : {}),
        }),
      });
      if (editingId && pending) {
        const updatedFeedback = parseFeedback(data);
        if (!updatedFeedback || updatedFeedback.id !== editingId) {
          throw new FeedbackRequestError("invalid_response");
        }
        const updated = { ...pending, content: updatedFeedback.content };
        setPending(updated);
        persistPending(updated);
        setFeedbackNotice(skinText(language, "editSaved"));
      } else {
        if (!isRecord(data)) throw new FeedbackRequestError("invalid_response");
        const createdFeedback = parseFeedback(data);
        const editToken = data.edit_token;
        if (
          !createdFeedback
          || typeof editToken !== "string"
          || !TOKEN_PATTERN.test(editToken)
        ) throw new FeedbackRequestError("invalid_response");
        const duration = (createdFeedback.publishAt - createdFeedback.createdAt) * 1000;
        if (duration < 1_000 || duration > EDIT_WINDOW_MS) throw new FeedbackRequestError("invalid_response");
        const created: PendingFeedback = {
          id: createdFeedback.id,
          content: createdFeedback.content,
          editToken,
          expiresAt: Date.now() + duration,
        };
        setPending(created);
        setEditingId(createdFeedback.id);
        persistPending(created);
        setFeedbackNotice(skinText(language, "feedbackSaved"));
      }
    } catch (error) {
      setFeedbackNotice(errorMessage(error, language));
      if (error instanceof FeedbackRequestError && ["edit_window_closed", "feedback_not_found"].includes(error.code)) {
        persistPending(null);
        setPending(null);
        setEditingId(null);
        setContent("");
        void refreshWall();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const contentLength = Array.from(content.trim()).length;

  return (
    <>
      {communityPromptOpen && (
        <div className="skinCommunityPromptOverlay">
          <div
            className="skinCommunityPrompt"
            data-tone="violet"
            ref={communityPromptDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="skin-community-prompt-title"
            aria-describedby="skin-community-prompt-description"
          >
            <span className="skinCommunityPromptIcon" aria-hidden="true"><SectionIcon name="communities" /></span>
            <span className="skinCommunityPromptEyebrow">{skinText(language, "communityPromptEyebrow")}</span>
            <h2 id="skin-community-prompt-title">{skinText(language, "communityPromptTitle")}</h2>
            <p id="skin-community-prompt-description">{skinText(language, "communityPromptBody")}</p>
            <div className="skinCommunityPromptActions">
              <button ref={communityPromptViewRef} type="button" onClick={() => dismissCommunityPrompt(true)}>
                {skinText(language, "communityPromptView")}
              </button>
              <button type="button" className="secondary" onClick={() => dismissCommunityPrompt(false)}>
                {skinText(language, "communityPromptDismiss")}
              </button>
            </div>
          </div>
        </div>
      )}
      <main className="pageShell gamesShell skinServiceShell" lang={language}>
      <section className="gamesHero skinServiceHero">
        <Link href="/" className="gamesHeroBack">{skinText(language, "backHome")}</Link>
        <div className="gamesHeroInner">
          <span className="gamesHeroEyebrow">{skinText(language, "eyebrow")}</span>
          <h1 className="gamesHeroTitle">{skinText(language, "pageTitle")}</h1>
          <p className="gamesHeroSubtitle">{skinText(language, "pageSubtitle")}</p>
        </div>
      </section>

      <section className="skinServiceSearch" aria-labelledby="skin-search-title">
        <div>
          <span>{skinText(language, "searchLabel")}</span>
          <h2 id="skin-search-title">{skinText(language, "searchTitle")}</h2>
        </div>
        <label className="skinServiceSearchField">
          <span className="visuallyHidden">{skinText(language, "searchLabel")}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={skinText(language, "searchPlaceholder")}
          />
          {query && <button type="button" onClick={() => setQuery("")}>{skinText(language, "clear")}</button>}
        </label>
        {query && (
          <div className="skinServiceSearchResults" aria-live="polite">
            {searchResults.length > 0 ? searchResults.map((result, index) => (
              <a
                key={`${result.href}-${index}`}
                href={result.href}
                onClick={(event) => {
                  event.preventDefault();
                  setQuery("");
                  setActiveArticleCategory("all");
                  window.requestAnimationFrame(() => {
                    document.getElementById(result.href.slice(1))?.scrollIntoView({ behavior: scrollBehavior(reduceAnimations) });
                    window.history.replaceState(null, "", result.href);
                  });
                }}
              >
                <strong>{result.title}</strong>
                <span>{result.text}</span>
              </a>
            )) : <p>{skinText(language, "noResults")}</p>}
          </div>
        )}
      </section>

      <nav className="skinServiceIndex" aria-label={skinText(language, "sectionsAria")}>
        {sections.map((section) => (
          <a key={section.id} className="skinServiceIndexLink" href={`#${section.id}`} data-tone={section.tone}>
            <span className="skinServiceIndexIcon" aria-hidden="true"><SectionIcon name={section.icon} /></span>
            <span><strong>{section.title}</strong><small>{section.summary}</small></span>
          </a>
        ))}
      </nav>

      <div className="skinServiceDocument">
        <section className="skinServiceDocumentSection" id="communities" data-tone="violet" tabIndex={-1}>
          <SectionHeader
            icon="communities"
            title={skinText(language, "communitiesTitle")}
            description={skinText(language, "communitiesDescription")}
          />
          <div className="skinCommunityGroup">
            <h3>{skinText(language, "wechatGroups")}</h3>
            <div className="skinCommunityGrid skinCommunityQrGrid">
              {wechatCommunities.map(renderCommunityCard)}
            </div>
          </div>
          <div className="skinCommunityGroup">
            <h3>{skinText(language, "otherGroups")}</h3>
            <div className="skinCommunityGrid">
              {otherCommunities.map(renderCommunityCard)}
            </div>
          </div>
          <p className="skinServiceLiveNotice" aria-live="polite">{communityNotice}</p>
        </section>

        <section className="skinServiceDocumentSection" id="questions" data-tone="cyan">
          <SectionHeader
            icon="questions"
            title={skinText(language, "questionsTitle")}
            description={skinText(language, "questionsDescription")}
          />
          <div className="skinArticleFilters" role="group" aria-label={skinText(language, "questionsSummary")}>
            {articleCategories.map((category) => (
              <button
                key={category.id}
                type="button"
                aria-pressed={activeArticleCategory === category.id}
                onClick={() => setActiveArticleCategory(category.id)}
              >
                {category.title}
              </button>
            ))}
          </div>
          <div className="skinArticleGrid">
            {visibleArticles.map((article) => (
              <article id={article.id} key={article.id}>
                <span className="skinArticleCategory">
                  {articleCategories.find((category) => category.id === article.category)?.title}
                </span>
                <h3>{article.title}</h3>
                <p>{article.content}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="skinServiceDocumentSection" id="feedback" data-tone="coral">
          <SectionHeader
            icon="feedback"
            title={skinText(language, "feedbackTitle")}
            description={skinText(language, "feedbackDescription")}
          />
          <div className="skinFeedbackLayout">
            <form className="skinFeedbackForm" onSubmit={submitFeedback}>
              <label htmlFor="skin-feedback-content">{skinText(language, editingId ? "editPending" : "writeFeedback")}</label>
              <textarea
                id="skin-feedback-content"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                rows={7}
                minLength={4}
                maxLength={500}
                disabled={submitting || !serviceUrl}
                placeholder={skinText(language, "feedbackPlaceholder")}
              />
              <label className="skinFeedbackTrap" aria-hidden="true">
                {skinText(language, "leaveEmpty")}
                <input name="website" value={website} onChange={(event) => setWebsite(event.target.value)} tabIndex={-1} autoComplete="off" />
              </label>
              <div className="skinFeedbackFormMeta">
                <span>{contentLength}／500</span>
                <button type="submit" disabled={submitting || !serviceUrl || contentLength < 4 || contentLength > 500}>
                  {skinText(language, submitting ? "saving" : editingId ? "saveChanges" : "submitFeedback")}
                </button>
              </div>
              <p className="skinFeedbackPolicy">{skinText(language, "feedbackPolicy")}</p>
              <p className="skinServiceLiveNotice" aria-live="polite">{feedbackNotice}</p>
            </form>

            <aside className="skinFeedbackPending">
              <span>{skinText(language, "pendingLabel")}</span>
              {pending ? (
                <>
                  <strong>{skinText(language, "remainingEditable", { time: formatCountdown(pending.expiresAt - now, language) })}</strong>
                  <p>{pending.content}</p>
                  <small>{skinText(language, "pendingSecurity")}</small>
                </>
              ) : <p>{skinText(language, "noPending")}</p>}
            </aside>
          </div>

          <div className="skinFeedbackWall">
            <div className="skinFeedbackWallHeader">
              <div><span>{skinText(language, "wallLabel")}</span><h3>{skinText(language, "wallTitle")}</h3></div>
              <button type="button" onClick={() => void refreshWall()} disabled={!serviceUrl || wallState === "loading" || loadingMore}>{skinText(language, "refresh")}</button>
            </div>
            {wallState === "unavailable" && <p className="skinFeedbackEmpty">{skinText(language, "serviceUnconfiguredWall")}</p>}
            {wallState === "loading" && <p className="skinFeedbackEmpty">{skinText(language, "wallLoading")}</p>}
            {wallState === "failed" && <p className="skinFeedbackEmpty">{skinText(language, "wallFailed")}</p>}
            {wallState === "ready" && wall.length === 0 && <p className="skinFeedbackEmpty">{skinText(language, "wallEmpty")}</p>}
            {wallState === "ready" && wall.length > 0 && (
              <>
                <div className="skinFeedbackList">
                  {wall.map((item) => (
                    <article id={`feedback-${item.id}`} key={item.id}>
                      <p>{item.content}</p>
                      <time dateTime={new Date(item.publishAt * 1000).toISOString()}>{formatDate(item.publishAt, language)}</time>
                    </article>
                  ))}
                </div>
                {nextCursor !== null && (
                  <button
                    className="skinFeedbackLoadMore"
                    type="button"
                    disabled={loadingMore}
                    onClick={() => void refreshWall(nextCursor)}
                  >
                    {skinText(language, loadingMore ? "loadingMore" : "loadMore")}
                  </button>
                )}
                <p className="skinServiceLiveNotice" aria-live="polite">{wallNotice}</p>
              </>
            )}
          </div>
        </section>

        <section className="skinServiceDocumentSection" id="review-notices" data-tone="amber">
          <SectionHeader
            icon="notices"
            title={skinText(language, "noticesTitle")}
            description={skinText(language, "noticesDescription")}
          />
          <div className="skinServicePlaceholder">
            <strong>{skinText(language, "wechatOfficialReserved")}</strong>
            <p>{skinText(language, "wechatOfficialBody")}</p>
          </div>
        </section>

        <section className="skinServiceDocumentSection" id="support" data-tone="emerald">
          <SectionHeader
            icon="support"
            title={skinText(language, "supportTitle")}
            description={skinText(language, "supportDescription")}
          />
          <div className="skinServicePlaceholder">
            <strong>{skinText(language, "donationReserved")}</strong>
            <p>{skinText(language, "donationBody")}</p>
          </div>
        </section>
      </div>
      </main>
    </>
  );
}
