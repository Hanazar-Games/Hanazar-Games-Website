"use client";

import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

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

const EDIT_WINDOW_MS = 5 * 60 * 1000;
const MAX_UNIX_SECONDS = Math.floor(8.64e15 / 1000);
const STORAGE_KEY = "hanazar.skin-feedback-edit.v1";
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

const sections = [
  { id: "communities", title: "我们的社群", summary: "聊天、交友与各群组入口" },
  { id: "questions", title: "代发皮肤常见问题", summary: "按问题阅读服务说明" },
  { id: "feedback", title: "匿名反馈墙", summary: "提交、修改与查看公开反馈" },
  { id: "review-notices", title: "审核通知", summary: "公众号通知入口预留" },
  { id: "support", title: "支持与捐赠", summary: "后续支持通道预留" },
];

const communities = [
  { name: "二群", kind: "微信", qr: true },
  { name: "三群", kind: "QQ群", value: "939095145" },
  { name: "四群", kind: "微信", qr: true },
  { name: "五群", kind: "语音社群", href: "https://discord.gg/XtTbKCSKa" },
  { name: "六群", kind: "QQ群", value: "853878672" },
  { name: "七群", kind: "微信", qr: true },
  { name: "八群", kind: "QQ群", value: "953014293" },
  { name: "九群", kind: "微信", qr: true },
  { name: "十群", kind: "QQ群", value: "1105843703" },
];

const articles = [
  {
    id: "service-introduction",
    title: "什么是代发皮肤服务？",
    content: "本中心用于集中说明代发皮肤相关流程、材料要求、审核通知和反馈渠道。具体规则以正式审核通知为准。",
  },
  {
    id: "submission-preparation",
    title: "提交前需要准备什么？",
    content: "请先整理作品说明、可核验的作者或授权信息，以及审核方后续明确要求的材料。不要提交账号密码、验证码或其他敏感凭据。",
  },
  {
    id: "review-status",
    title: "提交后如何查看审核状态？",
    content: "审核通知后续会统一发布到指定公众号。本页面的审核通知区域会在入口确认后更新，请勿相信非官方私聊中的收费或审核承诺。",
  },
  {
    id: "returned-materials",
    title: "为什么材料可能被退回？",
    content: "常见原因包括信息不完整、授权关系无法核验、图片或说明不清晰，以及内容不符合正式规则。收到退回通知后，请只按通知中列明的项目补充。",
  },
  {
    id: "change-submission",
    title: "已提交内容能否修改？",
    content: "是否可以修改取决于当次审核要求。若需要补充或更正，请通过正式通知中给出的渠道处理，避免重复提交造成记录混乱。",
  },
  {
    id: "privacy-protection",
    title: "如何保护账号和隐私？",
    content: "任何正常流程都不应索要密码、短信验证码或支付口令。公开反馈中也不要填写手机号、账号凭据、订单信息或其他可识别个人身份的内容。",
  },
];

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

function errorMessage(error: unknown) {
  if (!(error instanceof FeedbackRequestError)) return "操作失败，请稍后重试。";
  return {
    edit_window_closed: "五分钟修改时间已结束，这条反馈即将公开。",
    duplicate_feedback: "近期已有相同反馈，请勿重复提交。",
    invalid_feedback: "内容未通过检查，请减少重复字符、链接或无效信息。",
    feedback_not_found: "未找到可修改的反馈，或本机修改凭证已失效。",
    service_unavailable: "反馈服务暂时无法连接，请稍后重试。",
    invalid_response: "反馈服务返回异常，请稍后重试。",
    rate_limit_exceeded: "操作过于频繁，请按提示稍后再试。",
  }[error.code] ?? "操作失败，请稍后重试。";
}

function formatCountdown(milliseconds: number) {
  const total = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}分${String(seconds).padStart(2, "0")}秒`;
}

function formatDate(unixSeconds: number) {
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(unixSeconds * 1000);
}

export default function SkinServiceCenter({ serviceUrl }: { serviceUrl: string | null }) {
  const [query, setQuery] = useState("");
  const [communityNotice, setCommunityNotice] = useState("");
  const [wall, setWall] = useState<FeedbackItem[]>([]);
  const [wallState, setWallState] = useState<WallState>(serviceUrl ? "loading" : "unavailable");
  const [pending, setPending] = useState<PendingFeedback | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [content, setContent] = useState("");
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState("");
  const [now, setNow] = useState(Date.now());
  const wallRequestRef = useRef<AbortController | null>(null);

  const refreshWall = useCallback(async () => {
    wallRequestRef.current?.abort();
    if (!serviceUrl) {
      setWallState("unavailable");
      return;
    }
    const controller = new AbortController();
    wallRequestRef.current = controller;
    try {
      const data = await feedbackRequest(serviceUrl, "?limit=50", { method: "GET" }, controller.signal);
      const items = isRecord(data) && Array.isArray(data.items)
        ? data.items.map(parseFeedback).filter((item): item is FeedbackItem => item !== null)
        : null;
      if (!items) throw new FeedbackRequestError("invalid_response");
      if (wallRequestRef.current !== controller) return;
      setWall(items);
      setWallState("ready");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (wallRequestRef.current !== controller) return;
      setWallState("failed");
    } finally {
      if (wallRequestRef.current === controller) wallRequestRef.current = null;
    }
  }, [serviceUrl]);

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
      if (!document.hidden) void refreshWall();
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
    setFeedbackNotice("五分钟修改时间已结束，反馈已进入公共墙。若暂未出现，请稍后刷新。");
    void refreshWall();
  }, [now, pending, refreshWall]);

  const searchResults = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("zh-CN");
    if (!normalized) return [];
    const entries = [
      ...sections.map((section) => ({ title: section.title, text: section.summary, href: `#${section.id}` })),
      ...communities.map((community) => ({
        title: `${community.name} · ${community.kind}`,
        text: community.value ?? (community.qr ? "微信群二维码入口" : "语音社群邀请入口"),
        href: "#communities",
      })),
      ...articles.map((article) => ({ title: article.title, text: article.content, href: `#${article.id}` })),
      ...wall.map((item) => ({ title: "公开反馈", text: item.content, href: `#feedback-${item.id}` })),
    ];
    return entries.filter((entry) => `${entry.title} ${entry.text}`.toLocaleLowerCase("zh-CN").includes(normalized)).slice(0, 20);
  }, [query, wall]);

  const copyGroup = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCommunityNotice(`已复制群号 ${value}`);
    } catch {
      setCommunityNotice(`复制失败，请手动记录群号 ${value}`);
    }
  };

  const submitFeedback = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = content.trim();
    const length = Array.from(normalized).length;
    if (!serviceUrl) {
      setFeedbackNotice("反馈服务尚未配置，当前不能提交。");
      return;
    }
    if (length < 4 || length > 500) {
      setFeedbackNotice("反馈内容需要填写 4 至 500 个字符。");
      return;
    }
    if (editingId && (!pending || pending.id !== editingId)) {
      setFeedbackNotice("本机修改凭证已失效，请刷新页面。");
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
        setFeedbackNotice("反馈已更新，公开倒计时不变。");
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
        setFeedbackNotice("反馈已保存。本机可在五分钟内修改，倒计时结束后将公开。");
      }
    } catch (error) {
      setFeedbackNotice(errorMessage(error));
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
    <main className="pageShell gamesShell skinServiceShell" lang="zh-CN">
      <section className="gamesHero skinServiceHero">
        <Link href="/" className="gamesHeroBack">返回主页</Link>
        <div className="gamesHeroInner">
          <span className="gamesHeroEyebrow">服务文档</span>
          <h1 className="gamesHeroTitle">代发皮肤服务中心</h1>
          <p className="gamesHeroSubtitle">社群入口、问题说明、审核通知与匿名反馈集中在这里。</p>
        </div>
      </section>

      <section className="skinServiceSearch" aria-labelledby="skin-search-title">
        <div>
          <span>全局搜索</span>
          <h2 id="skin-search-title">搜索服务中心的任何内容</h2>
        </div>
        <label className="skinServiceSearchField">
          <span className="visuallyHidden">搜索内容</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索社群、问题、通知或公开反馈"
          />
          {query && <button type="button" onClick={() => setQuery("")}>清除</button>}
        </label>
        {query && (
          <div className="skinServiceSearchResults" aria-live="polite">
            {searchResults.length > 0 ? searchResults.map((result, index) => (
              <a key={`${result.href}-${index}`} href={result.href}>
                <strong>{result.title}</strong>
                <span>{result.text}</span>
              </a>
            )) : <p>没有找到相关内容，请尝试更短的关键词。</p>}
          </div>
        )}
      </section>

      <nav className="skinServiceIndex" aria-label="文档分区">
        {sections.map((section, index) => (
          <a key={section.id} className="skinServiceIndexLink" href={`#${section.id}`}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <span><strong>{section.title}</strong><small>{section.summary}</small></span>
          </a>
        ))}
      </nav>

      <div className="skinServiceDocument">
        <section className="skinServiceDocumentSection" id="communities">
          <header className="skinServiceSectionHeader">
            <span>01</span>
            <div><h2>我们的社群</h2><p>选择对应入口加入聊天与交友交流群。</p></div>
          </header>
          <div className="skinCommunityGrid">
            {communities.map((community) => (
              <article className="skinCommunityCard" key={community.name}>
                <div><span>{community.kind}</span><h3>{community.name}</h3></div>
                {community.qr && (
                  <div className="skinCommunityQr" role="img" aria-label={`${community.name}二维码待补充`}>
                    <strong>二维码待补充</strong>
                    <small>请提供原始图片后启用</small>
                  </div>
                )}
                {community.value && (
                  <>
                    <code>{community.value}</code>
                    <button type="button" onClick={() => void copyGroup(community.value!)}>复制群号</button>
                  </>
                )}
                {community.href && (
                  <a href={community.href} target="_blank" rel="noopener noreferrer">打开五群入口</a>
                )}
              </article>
            ))}
          </div>
          <p className="skinServiceLiveNotice" aria-live="polite">{communityNotice}</p>
        </section>

        <section className="skinServiceDocumentSection" id="questions">
          <header className="skinServiceSectionHeader">
            <span>02</span>
            <div><h2>代发皮肤常见问题</h2><p>每个问题是一篇独立说明，后续可继续扩充。</p></div>
          </header>
          <div className="skinArticleGrid">
            {articles.map((article) => (
              <article id={article.id} key={article.id}>
                <h3>{article.title}</h3>
                <p>{article.content}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="skinServiceDocumentSection" id="feedback">
          <header className="skinServiceSectionHeader">
            <span>03</span>
            <div><h2>匿名反馈墙</h2><p>不要求登录。提交后仅本机可修改五分钟，之后进入公共墙。</p></div>
          </header>
          <div className="skinFeedbackLayout">
            <form className="skinFeedbackForm" onSubmit={submitFeedback}>
              <label htmlFor="skin-feedback-content">{editingId ? "修改待公开反馈" : "写下匿名反馈"}</label>
              <textarea
                id="skin-feedback-content"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                rows={7}
                minLength={4}
                maxLength={500}
                disabled={submitting || !serviceUrl}
                placeholder="请描述具体问题或建议，不要填写隐私信息。"
              />
              <label className="skinFeedbackTrap" aria-hidden="true">
                留空
                <input name="website" value={website} onChange={(event) => setWebsite(event.target.value)} tabIndex={-1} autoComplete="off" />
              </label>
              <div className="skinFeedbackFormMeta">
                <span>{contentLength}／500</span>
                <button type="submit" disabled={submitting || !serviceUrl || contentLength < 4 || contentLength > 500}>
                  {submitting ? "正在保存" : editingId ? "保存修改" : "提交反馈"}
                </button>
              </div>
              <p className="skinFeedbackPolicy">同一网络每小时最多提交三次；重复内容、异常字符和刷屏内容会被拦截。</p>
              <p className="skinServiceLiveNotice" aria-live="polite">{feedbackNotice}</p>
            </form>

            <aside className="skinFeedbackPending">
              <span>本机待公开反馈</span>
              {pending ? (
                <>
                  <strong>剩余 {formatCountdown(pending.expiresAt - now)} 可修改</strong>
                  <p>{pending.content}</p>
                  <small>修改不会延长原倒计时。修改凭证仅保存在当前浏览器，清除浏览器数据后无法恢复。</small>
                </>
              ) : <p>当前没有待公开反馈。提交后，这里会显示五分钟修改倒计时。</p>}
            </aside>
          </div>

          <div className="skinFeedbackWall">
            <div className="skinFeedbackWallHeader">
              <div><span>公共墙</span><h3>已经公开的反馈</h3></div>
              <button type="button" onClick={() => void refreshWall()} disabled={!serviceUrl || wallState === "loading"}>刷新</button>
            </div>
            {wallState === "unavailable" && <p className="skinFeedbackEmpty">反馈服务尚未配置，公共墙暂不可用。</p>}
            {wallState === "loading" && <p className="skinFeedbackEmpty">正在读取公开反馈……</p>}
            {wallState === "failed" && <p className="skinFeedbackEmpty">公共墙暂时无法连接，请稍后刷新。</p>}
            {wallState === "ready" && wall.length === 0 && <p className="skinFeedbackEmpty">还没有公开反馈。</p>}
            {wallState === "ready" && wall.length > 0 && (
              <div className="skinFeedbackList">
                {wall.map((item) => (
                  <article id={`feedback-${item.id}`} key={item.id}>
                    <p>{item.content}</p>
                    <time dateTime={new Date(item.publishAt * 1000).toISOString()}>{formatDate(item.publishAt)}</time>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="skinServiceDocumentSection" id="review-notices">
          <header className="skinServiceSectionHeader">
            <span>04</span>
            <div><h2>审核通知</h2><p>正式审核结果将通过指定公众号发布。</p></div>
          </header>
          <div className="skinServicePlaceholder">
            <strong>公众号入口预留</strong>
            <p>公众号信息确认后会在这里放置名称、二维码和通知说明。在入口公布前，请不要向任何自称审核人员的账号提供密码、验证码或付款。</p>
          </div>
        </section>

        <section className="skinServiceDocumentSection" id="support">
          <header className="skinServiceSectionHeader">
            <span>05</span>
            <div><h2>支持与捐赠</h2><p>支持通道将在核验后开放。</p></div>
          </header>
          <div className="skinServicePlaceholder">
            <strong>捐赠入口预留</strong>
            <p>当前没有启用任何捐赠通道。请勿向私聊发送的收款码付款；正式入口开放后，会在本页面明确展示并提供核验说明。</p>
          </div>
        </section>
      </div>
    </main>
  );
}
