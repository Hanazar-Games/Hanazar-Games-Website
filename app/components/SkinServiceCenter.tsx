"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSettingsContext } from "./SettingsContext";
import { assetPath } from "../lib/paths";
import { reviewBatches } from "../lib/reviewBatches";
import packageInfo from "../../package.json";
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
type CommunityPlatform = "wechat" | "qq" | "discord";
export type SkinServiceSection = "communities" | "questions" | "feedback" | "review-notices" | "support";

const EDIT_WINDOW_MS = 5 * 60 * 1000;
const WALL_PAGE_SIZE = 20;
const MAX_UNIX_SECONDS = Math.floor(8.64e15 / 1000);
const STORAGE_KEY = "hanazar.skin-feedback-edit.v1";
const COMMUNITY_PROMPT_STORAGE_KEY = "hanazar.skin-service-community-prompt.v1";
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const COMPLETED_REVIEW_BATCHES = reviewBatches.filter((batch) => batch.status === "completed");
const COMPLETED_REVIEW_COMPONENTS = COMPLETED_REVIEW_BATCHES.reduce(
  (total, batch) => total + (batch.componentCount ?? 0),
  0,
);

const sectionDefinitions: Array<{
  id: SkinServiceSection;
  icon: SectionIconName;
  title: SkinTextKey;
  summary: SkinTextKey;
  description: SkinTextKey;
}> = [
  { id: "communities", icon: "communities", title: "communitiesTitle", summary: "communitiesSummary", description: "communitiesDescription" },
  { id: "questions", icon: "questions", title: "questionsTitle", summary: "questionsSummary", description: "questionsDescription" },
  { id: "feedback", icon: "feedback", title: "feedbackTitle", summary: "feedbackSummary", description: "feedbackDescription" },
  { id: "review-notices", icon: "notices", title: "noticesTitle", summary: "noticesSummary", description: "noticesDescription" },
  { id: "support", icon: "support", title: "supportTitle", summary: "supportSummary", description: "supportDescription" },
];

const communityDefinitions: Array<{
  id: string;
  name: SkinTextKey;
  kind: SkinTextKey;
  platform: CommunityPlatform;
  image?: string;
  value?: string;
  href?: string;
}> = [
  { id: "group-2", name: "group2", kind: "wechat", platform: "wechat", image: "/skin-service/groups/group-2.jpg" },
  { id: "group-3", name: "group3", kind: "qqGroup", platform: "qq", value: "939095145" },
  { id: "group-4", name: "group4", kind: "wechat", platform: "wechat", image: "/skin-service/groups/group-4.jpg" },
  { id: "group-5", name: "group5", kind: "discord", platform: "discord", href: "https://discord.gg/XtTbKCSKa" },
  { id: "group-6", name: "group6", kind: "qqGroup", platform: "qq", value: "853878672" },
  { id: "group-7", name: "group7", kind: "wechat", platform: "wechat", image: "/skin-service/groups/group-7.jpg" },
  { id: "group-8", name: "group8", kind: "qqGroup", platform: "qq", value: "953014293" },
  { id: "group-9", name: "group9", kind: "wechat", platform: "wechat", image: "/skin-service/groups/group-9.jpg" },
  { id: "group-10", name: "group10", kind: "qqGroup", platform: "qq", value: "1105843703" },
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

export default function SkinServiceCenter({
  serviceUrl,
  activeSection,
}: {
  serviceUrl: string | null;
  activeSection?: SkinServiceSection;
}) {
  const router = useRouter();
  const { settings } = useSettingsContext();
  const language = skinServiceLanguage(settings.language);
  const [query, setQuery] = useState("");
  const [activeArticleCategory, setActiveArticleCategory] = useState<ArticleCategory>("all");
  const [communityPromptOpen, setCommunityPromptOpen] = useState(false);
  const [enlargedCommunityId, setEnlargedCommunityId] = useState<string | null>(null);
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
  const communityImageDialogRef = useRef<HTMLDivElement | null>(null);
  const communityImageCloseRef = useRef<HTMLButtonElement | null>(null);
  const communityImagePreviousFocusRef = useRef<HTMLElement | null>(null);
  const pageMainRef = useRef<HTMLElement | null>(null);
  const sections = sectionDefinitions.map((section) => ({
    ...section,
    title: skinText(language, section.title),
    summary: skinText(language, section.summary),
    description: skinText(language, section.description),
  }));
  const activeSectionDetails = sections.find((section) => section.id === activeSection);
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
  const wechatCommunities = communities.filter((community) => community.platform === "wechat");
  const qqCommunities = communities.filter((community) => community.platform === "qq");
  const discordCommunities = communities.filter((community) => community.platform === "discord");
  const enlargedCommunity = enlargedCommunityId === "review-account"
    ? {
        id: "review-account",
        name: "千川bit",
        kind: skinText(language, "noticesTitle"),
        image: "/skin-service/review-account-qr.svg",
      }
    : communities.find((community) => community.id === enlargedCommunityId && community.image);
  const enlargedImageDimensions = enlargedCommunity?.id === "review-account"
    ? { width: 430, height: 430 }
    : { width: 1050, height: 1566 };
  const reduceAnimations = settings.reduceAnimations || !settings.animationsEnabled;

  const dismissCommunityPrompt = useCallback((showCommunities: boolean) => {
    try {
      localStorage.setItem(COMMUNITY_PROMPT_STORAGE_KEY, "1");
    } catch {
      // The prompt still stays closed for the current page session.
    }
    setCommunityPromptOpen(false);
    if (!showCommunities) return;
    router.push("/skin-service/communities");
  }, [router]);

  useEffect(() => {
    if (activeSection) return;
    try {
      if (localStorage.getItem(COMMUNITY_PROMPT_STORAGE_KEY) !== "1") {
        setCommunityPromptOpen(true);
      }
    } catch {
      setCommunityPromptOpen(true);
    }
  }, [activeSection]);

  useEffect(() => {
    if (!communityPromptOpen) return;
    const body = document.body;
    const main = pageMainRef.current;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    const previousAriaHidden = main?.getAttribute("aria-hidden") ?? null;
    const previousInert = main?.hasAttribute("inert") ?? false;
    communityPromptPreviousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    body.style.overflow = "hidden";
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      const currentPadding = Number.parseFloat(getComputedStyle(body).paddingRight) || 0;
      body.style.paddingRight = `${currentPadding + scrollbarWidth}px`;
    }
    body.setAttribute("data-community-prompt-open", "true");
    main?.setAttribute("aria-hidden", "true");
    main?.setAttribute("inert", "");
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
      body.style.paddingRight = previousPaddingRight;
      body.removeAttribute("data-community-prompt-open");
      if (main) {
        if (previousAriaHidden === null) main.removeAttribute("aria-hidden");
        else main.setAttribute("aria-hidden", previousAriaHidden);
        if (!previousInert) main.removeAttribute("inert");
      }
      if (communityPromptPreviousFocusRef.current?.isConnected) {
        communityPromptPreviousFocusRef.current.focus({ preventScroll: true });
      }
    };
  }, [communityPromptOpen, dismissCommunityPrompt]);

  useEffect(() => {
    if (!enlargedCommunityId) return;
    const body = document.body;
    const main = pageMainRef.current;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    const previousAriaHidden = main?.getAttribute("aria-hidden") ?? null;
    const previousInert = main?.hasAttribute("inert") ?? false;
    communityImagePreviousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    body.style.overflow = "hidden";
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      const currentPadding = Number.parseFloat(getComputedStyle(body).paddingRight) || 0;
      body.style.paddingRight = `${currentPadding + scrollbarWidth}px`;
    }
    body.setAttribute("data-skin-image-open", "true");
    main?.setAttribute("aria-hidden", "true");
    main?.setAttribute("inert", "");
    const frame = window.requestAnimationFrame(() => communityImageCloseRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setEnlargedCommunityId(null);
        return;
      }
      if (event.key !== "Tab" || !communityImageDialogRef.current) return;
      const focusable = Array.from(
        communityImageDialogRef.current.querySelectorAll<HTMLElement>(
          "button:not(:disabled), a[href], [tabindex]:not([tabindex='-1'])",
        ),
      ).filter((element) => element.offsetParent !== null);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!communityImageDialogRef.current.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
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
      body.style.paddingRight = previousPaddingRight;
      body.removeAttribute("data-skin-image-open");
      if (main) {
        if (previousAriaHidden === null) main.removeAttribute("aria-hidden");
        else main.setAttribute("aria-hidden", previousAriaHidden);
        if (!previousInert) main.removeAttribute("inert");
      }
      if (communityImagePreviousFocusRef.current?.isConnected) {
        communityImagePreviousFocusRef.current.focus({ preventScroll: true });
      }
    };
  }, [enlargedCommunityId]);

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

  const revealTarget = useCallback((targetId: string, behavior = scrollBehavior(reduceAnimations)) => {
    const target = document.getElementById(targetId);
    if (target instanceof HTMLDetailsElement) target.open = true;
    target?.scrollIntoView({ behavior, block: "start" });
    if (target instanceof HTMLDetailsElement) target.querySelector("summary")?.focus({ preventScroll: true });
    else if (target instanceof HTMLElement && target.hasAttribute("tabindex")) target.focus({ preventScroll: true });
  }, [reduceAnimations]);

  useEffect(() => {
    const revealHash = () => {
      const targetId = decodeURIComponent(window.location.hash.slice(1));
      if (targetId) window.requestAnimationFrame(() => revealTarget(targetId, "auto"));
    };
    revealHash();
    window.addEventListener("hashchange", revealHash);
    return () => window.removeEventListener("hashchange", revealHash);
  }, [activeSection, revealTarget]);

  const searchResults = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(language);
    if (!normalized) return [];
    const entries = [
      ...sections.map((section) => ({
        title: section.title,
        text: section.summary,
        href: `/skin-service/${section.id}`,
        section: section.id,
        targetId: section.id,
      })),
      ...communities.map((community) => ({
        title: `${community.name} · ${community.kind}`,
        text: community.value ?? (community.image ? skinText(language, "qrAvailable") : community.kind),
        href: `/skin-service/communities#community-${community.id}`,
        section: "communities" as const,
        targetId: `community-${community.id}`,
      })),
      {
        title: skinText(language, "communityBulletinTitle"),
        text: `${skinText(language, "communityBulletinBody")} ${skinText(language, "websiteVersion", { version: packageInfo.version })}`,
        href: "/skin-service/communities#community-bulletin",
        section: "communities" as const,
        targetId: "community-bulletin",
      },
      ...articles.map((article) => ({
        title: article.title,
        text: `${articleCategories.find((category) => category.id === article.category)?.title ?? ""} ${article.content}`,
        href: `/skin-service/questions#${article.id}`,
        section: "questions" as const,
        targetId: article.id,
      })),
      ...wall.map((item) => ({
        title: skinText(language, "publicFeedbackSearch"),
        text: item.content,
        href: `/skin-service/feedback#feedback-${item.id}`,
        section: "feedback" as const,
        targetId: `feedback-${item.id}`,
      })),
      {
        title: skinText(language, "wechatOfficialReserved"),
        text: skinText(language, "wechatOfficialBody"),
        href: "/skin-service/review-notices#official-account-notice",
        section: "review-notices" as const,
        targetId: "official-account-notice",
      },
      {
        title: skinText(language, "donationReserved"),
        text: skinText(language, "donationBody"),
        href: "/skin-service/support#support-channel",
        section: "support" as const,
        targetId: "support-channel",
      },
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
    <details
      id={`community-${community.id}`}
      className={`skinCommunityCard${community.image ? " skinCommunityCardQr" : ""}`}
      key={community.id}
    >
      <summary><span>{community.kind}</span><strong>{community.name}</strong></summary>
      <div className="skinCommunityCardContent">
        {community.image && (
          <>
            <button
              className="skinCommunityQrButton"
              type="button"
              aria-label={skinText(language, "enlargeQr", { group: community.name })}
              onClick={() => setEnlargedCommunityId(community.id)}
            >
              <span className="skinCommunityQr">
                <Image
                  className="skinCommunityQrImage"
                  src={assetPath(community.image)}
                  alt={skinText(language, "qrImageAlt", { group: community.name })}
                  width={1050}
                  height={1566}
                  sizes="(max-width: 480px) calc(100vw - 90px), (max-width: 800px) calc(50vw - 54px), 270px"
                />
                <span className="skinCommunityQrZoom" aria-hidden="true">
                  <svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="5.5" /><path d="m15 15 5 5M10.5 8v5M8 10.5h5" /></svg>
                </span>
              </span>
            </button>
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
          <a href={community.href} target="_blank" rel="noopener noreferrer">{skinText(language, "openDiscord")}</a>
        )}
      </div>
    </details>
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
      {enlargedCommunity?.image && (
        <div className="skinCommunityLightboxOverlay" onClick={() => setEnlargedCommunityId(null)}>
          <div
            className="skinCommunityLightbox"
            ref={communityImageDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="skin-community-image-title"
            aria-describedby="skin-community-image-hint"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <span>{skinText(language, "wechat")}</span>
                <h2 id="skin-community-image-title">{enlargedCommunity.name}</h2>
              </div>
              <button
                ref={communityImageCloseRef}
                type="button"
                onClick={() => setEnlargedCommunityId(null)}
                aria-label={skinText(language, "closeQr")}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
              </button>
            </header>
            <div className="skinCommunityLightboxImage">
              <Image
                src={assetPath(enlargedCommunity.image)}
                alt={enlargedCommunity.id === "review-account"
                  ? skinText(language, "reviewQrAlt")
                  : skinText(language, "qrImageAlt", { group: enlargedCommunity.name })}
                width={enlargedImageDimensions.width}
                height={enlargedImageDimensions.height}
                sizes="(max-width: 700px) calc(100vw - 48px), 720px"
                priority
              />
            </div>
            <p id="skin-community-image-hint">{skinText(language, "enlargedQrHint")}</p>
          </div>
        </div>
      )}
      <main className="pageShell gamesShell skinServiceShell" lang={language} ref={pageMainRef}>
      <section className="gamesHero skinServiceHero">
        <Link href={activeSection ? "/skin-service" : "/"} className="gamesHeroBack">
          {skinText(language, activeSection ? "backServiceCenter" : "backHome")}
        </Link>
        <div className="gamesHeroInner">
          <span className="gamesHeroEyebrow">{skinText(language, "eyebrow")}</span>
          <h1 className="gamesHeroTitle">{activeSectionDetails?.title ?? skinText(language, "pageTitle")}</h1>
          <p className="gamesHeroSubtitle">{activeSectionDetails?.description ?? skinText(language, "pageSubtitle")}</p>
        </div>
      </section>

      {activeSection && (
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
              <Link
                key={`${result.href}-${index}`}
                href={result.href}
                onClick={(event) => {
                  setQuery("");
                  setActiveArticleCategory("all");
                  if (result.section !== activeSection) return;
                  event.preventDefault();
                  window.requestAnimationFrame(() => {
                    revealTarget(result.targetId);
                    window.history.replaceState(null, "", `#${result.targetId}`);
                  });
                }}
              >
                <strong>{result.title}</strong>
                <span>{result.text}</span>
              </Link>
            )) : <p>{skinText(language, "noResults")}</p>}
          </div>
        )}
      </section>
      )}

      <nav
        className={`skinServiceIndex ${activeSection ? "skinServiceSectionNav" : "skinServiceHubGrid"}`}
        aria-label={skinText(language, "sectionsAria")}
      >
        {sections.map((section) => (
          <Link
            key={section.id}
            className={`skinServiceIndexLink${activeSection === section.id ? " isActive" : ""}`}
            href={`/skin-service/${section.id}`}
            aria-current={activeSection === section.id ? "page" : undefined}
          >
            <span className="skinServiceIndexIcon" aria-hidden="true"><SectionIcon name={section.icon} /></span>
            <span className="skinServiceIndexCopy"><strong>{section.title}</strong><small>{section.summary}</small></span>
            {!activeSection && (
              <span className="skinServiceIndexArrow">
                {skinText(language, "openSection")} <span aria-hidden="true">→</span>
              </span>
            )}
          </Link>
        ))}
      </nav>

      {activeSection && <div className="skinServiceDocument">
        {activeSection === "communities" && <section className="skinServiceDocumentSection" id="communities" tabIndex={-1}>
          <SectionHeader
            icon="communities"
            title={skinText(language, "communitiesTitle")}
            description={skinText(language, "communitiesDescription")}
          />
          <aside className="skinCommunityBulletin" id="community-bulletin" tabIndex={-1} aria-labelledby="community-bulletin-title">
            <span className="skinCommunityBulletinIcon" aria-hidden="true"><SectionIcon name="notices" /></span>
            <div>
              <div className="skinCommunityBulletinMeta">
                <span>{skinText(language, "communityBulletinLabel")}</span>
                <strong>{skinText(language, "websiteVersion", { version: packageInfo.version })}</strong>
              </div>
              <h3 id="community-bulletin-title">{skinText(language, "communityBulletinTitle")}</h3>
              <p>{skinText(language, "communityBulletinBody")}</p>
            </div>
          </aside>
          <div className="skinCommunityGroup">
            <h3>{skinText(language, "wechatGroups")}</h3>
            <div className="skinCommunityGrid skinCommunityQrGrid">
              {wechatCommunities.map(renderCommunityCard)}
            </div>
          </div>
          <div className="skinCommunityGroup">
            <h3>{skinText(language, "qqGroups")}</h3>
            <div className="skinCommunityGrid">
              {qqCommunities.map(renderCommunityCard)}
            </div>
          </div>
          <div className="skinCommunityGroup">
            <h3>{skinText(language, "discordGroups")}</h3>
            <div className="skinCommunityGrid skinCommunityDiscordGrid">
              {discordCommunities.map(renderCommunityCard)}
            </div>
          </div>
          <p className="skinServiceLiveNotice" aria-live="polite">{communityNotice}</p>
        </section>}

        {activeSection === "questions" && <section className="skinServiceDocumentSection" id="questions" tabIndex={-1}>
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
                <article id={article.id} key={article.id} tabIndex={-1}>
                <span className="skinArticleCategory">
                  {articleCategories.find((category) => category.id === article.category)?.title}
                </span>
                <h3>{article.title}</h3>
                <p>{article.content}</p>
              </article>
            ))}
          </div>
        </section>}

        {activeSection === "feedback" && <section className="skinServiceDocumentSection" id="feedback" tabIndex={-1}>
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
                    <article id={`feedback-${item.id}`} key={item.id} tabIndex={-1}>
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
        </section>}

        {activeSection === "review-notices" && <section className="skinServiceDocumentSection" id="review-notices" tabIndex={-1}>
          <SectionHeader
            icon="notices"
            title={skinText(language, "noticesTitle")}
            description={skinText(language, "noticesDescription")}
          />
          <div className="skinReviewAccount" id="official-account-notice" tabIndex={-1}>
            <div className="skinReviewAccountCopy">
              <span>{skinText(language, "noticesTitle")}</span>
              <strong>{skinText(language, "wechatOfficialReserved")}</strong>
              <p>{skinText(language, "wechatOfficialBody")}</p>
            </div>
            <button
              className="skinReviewQrButton"
              type="button"
              aria-label={skinText(language, "reviewQrAlt")}
              onClick={() => setEnlargedCommunityId("review-account")}
            >
              <Image
                src={assetPath("/skin-service/review-account-qr.svg")}
                alt={skinText(language, "reviewQrAlt")}
                width={430}
                height={430}
                sizes="(max-width: 480px) calc(100vw - 84px), 230px"
              />
              <span className="skinCommunityQrZoom" aria-hidden="true">
                <svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="5.5" /><path d="m15 15 4 4M10.5 8v5M8 10.5h5" /></svg>
              </span>
            </button>
          </div>

          <div className="skinReviewTracker">
            <header className="skinReviewTrackerHeader">
              <div>
                <span>{skinText(language, "reviewTrackerLabel")}</span>
                <h3>{skinText(language, "reviewTrackerTitle")}</h3>
                <p>{skinText(language, "reviewTrackerSummary", {
                  batches: COMPLETED_REVIEW_BATCHES.length,
                  count: COMPLETED_REVIEW_COMPONENTS.toLocaleString(language),
                })}</p>
              </div>
              <span className="skinReviewCurrentStatus">{skinText(language, "reviewStatusReviewing")}</span>
            </header>

            <details className="skinReviewArchive">
              <summary>
                <span><strong>{skinText(language, "reviewArchiveTitle")}</strong><small>{skinText(language, "reviewArchiveHint")}</small></span>
                <span aria-hidden="true">⌄</span>
              </summary>
              <div className="skinReviewColumns" aria-hidden="true">
                <span>{skinText(language, "reviewBatchColumn")}</span>
                <span>{skinText(language, "reviewStatusColumn")}</span>
                <span>{skinText(language, "reviewComponentsColumn")}</span>
              </div>
              <div className="skinReviewBatchList">
                {reviewBatches.map((batch) => {
                  const reviewing = batch.status === "reviewing";
                  const componentCount = batch.componentCount === null
                    ? skinText(language, "reviewComponentsPending")
                    : skinText(language, "reviewComponentsCount", { count: batch.componentCount });
                  return (
                    <details className={`skinReviewBatch${reviewing ? " isReviewing" : ""}`} key={batch.number}>
                      <summary>
                        <strong>{skinText(language, "reviewBatchName", { batch: batch.number })}</strong>
                        <span className="skinReviewStatus">{skinText(language, reviewing ? "reviewStatusReviewing" : "reviewStatusCompleted")}</span>
                        <span>{componentCount}</span>
                        <span className="skinReviewBatchChevron" aria-hidden="true">⌄</span>
                      </summary>
                      <p>{skinText(language, reviewing ? "reviewBatchReviewingDetail" : "reviewBatchCompletedDetail", {
                        count: batch.componentCount ?? 0,
                      })}</p>
                    </details>
                  );
                })}
              </div>
            </details>
          </div>
        </section>}

        {activeSection === "support" && <section className="skinServiceDocumentSection" id="support" tabIndex={-1}>
          <SectionHeader
            icon="support"
            title={skinText(language, "supportTitle")}
            description={skinText(language, "supportDescription")}
          />
          <div className="skinServicePlaceholder" id="support-channel" tabIndex={-1}>
            <strong>{skinText(language, "donationReserved")}</strong>
            <p>{skinText(language, "donationBody")}</p>
          </div>
        </section>}
      </div>}
      </main>
    </>
  );
}
