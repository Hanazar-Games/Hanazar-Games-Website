"use client";

import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "../hooks/useTranslation";
import {
  MAX_SHARE_FILE_BYTES,
  MAX_SHARE_FILES,
  MAX_SHARE_TEXT_LENGTH,
  cryptoSupported,
  decryptShare,
  encryptShare,
} from "../lib/ephemeralShareCrypto";

interface ApiEnvelope {
  ok: boolean;
  data: unknown;
  error: { code?: unknown; message?: unknown } | null;
}

interface ShareLogEntry {
  id: string;
  createdAt: number;
  expiresAt: number;
  fileCount: number;
  totalBytes: number;
  shareUrl?: string;
}

interface CreatedShare {
  shareUrl: string;
  createdAt: number;
  expiresAt: number;
}

interface ViewedAttachment {
  name: string;
  type: string;
  size: number;
  url: string;
}

interface ViewedShare {
  text: string;
  attachments: ViewedAttachment[];
}

interface ShareLocation {
  token: string | null;
  key: string | null;
}

type ViewerState = "idle" | "loading" | "ready" | "expired" | "not_found" | "missing_key" | "corrupt" | "failed";

const STORAGE_KEY = "hanazar.ephemeral-share-log.v1";
const EXPIRATION_PRESETS = [5, 15, 30, 60, 180, 1440];
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

class ShareRequestError extends Error {
  constructor(public readonly code: string, public readonly status: number) {
    super(code);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KiB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MiB`;
}

function formatRemaining(milliseconds: number) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${remainder}s`;
  if (minutes > 0) return `${minutes}m ${remainder}s`;
  return `${remainder}s`;
}

function createLocalId() {
  return cryptoSupported() && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function parseLogEntry(value: unknown, now: number): ShareLogEntry | null {
  if (!isRecord(value)) return null;
  const { id, createdAt, expiresAt, fileCount, totalBytes } = value;
  if (
    typeof id !== "string"
    || id.length > 100
    || typeof createdAt !== "number"
    || !Number.isFinite(createdAt)
    || typeof expiresAt !== "number"
    || !Number.isFinite(expiresAt)
    || typeof fileCount !== "number"
    || !Number.isSafeInteger(fileCount)
    || fileCount < 0
    || fileCount > MAX_SHARE_FILES
    || typeof totalBytes !== "number"
    || !Number.isSafeInteger(totalBytes)
    || totalBytes < 0
    || totalBytes > MAX_SHARE_FILE_BYTES
  ) {
    return null;
  }
  const shareUrl = expiresAt > now && typeof value.shareUrl === "string" && value.shareUrl.length <= 2048
    ? value.shareUrl
    : undefined;
  return { id, createdAt, expiresAt, fileCount, totalBytes, ...(shareUrl ? { shareUrl } : {}) };
}

function loadLogs(now: number) {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.map((entry) => parseLogEntry(entry, now)).filter((entry): entry is ShareLogEntry => entry !== null).slice(0, 50);
  } catch {
    return [];
  }
}

function persistLogs(logs: ShareLogEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs.slice(0, 50)));
  } catch {
    // The active result remains copyable when private browsing blocks storage.
  }
}

function endpoint(serviceUrl: string, path: string) {
  return new URL(`api/${path.replace(/^\//, "")}`, serviceUrl).href;
}

async function apiRequest(serviceUrl: string, path: string, init: RequestInit, signal?: AbortSignal) {
  let response: Response;
  try {
    response = await fetch(endpoint(serviceUrl, path), {
      ...init,
      signal,
      cache: "no-store",
      credentials: "omit",
      referrerPolicy: "no-referrer",
      headers: { Accept: "application/json", ...init.headers },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ShareRequestError("service_unavailable", 0);
  }

  let envelope: ApiEnvelope | null = null;
  try {
    envelope = await response.json() as ApiEnvelope;
  } catch {
    throw new ShareRequestError("invalid_response", response.status);
  }
  if (!envelope || envelope.ok !== true || !isRecord(envelope.data)) {
    const code = typeof envelope?.error?.code === "string" ? envelope.error.code : "request_failed";
    throw new ShareRequestError(code, response.status);
  }
  return envelope.data;
}

function viewerErrorState(error: unknown): ViewerState {
  if (error instanceof ShareRequestError) {
    if (error.code === "share_expired") return "expired";
    if (error.code === "share_not_found") return "not_found";
    return "failed";
  }
  if (error instanceof DOMException && error.name === "OperationError") return "corrupt";
  if (error instanceof Error && ["invalid_base64url", "invalid_ciphertext", "invalid_payload"].includes(error.message)) {
    return "corrupt";
  }
  return "failed";
}

export default function EphemeralShareApp({ serviceUrl }: { serviceUrl: string | null }) {
  const { tr, lang } = useTranslation();
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlsRef = useRef(new Set<string>());
  const [now, setNow] = useState(Date.now());
  const [hasCrypto, setHasCrypto] = useState(true);
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [expiration, setExpiration] = useState("15");
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState("");
  const [created, setCreated] = useState<CreatedShare | null>(null);
  const [logs, setLogs] = useState<ShareLogEntry[]>([]);
  const [shareLocation, setShareLocation] = useState<ShareLocation>({ token: null, key: null });
  const [viewerState, setViewerState] = useState<ViewerState>("idle");
  const [viewed, setViewed] = useState<ViewedShare | null>(null);
  const [viewExpiresAt, setViewExpiresAt] = useState<number | null>(null);

  const revokeViewedFiles = useCallback(() => {
    for (const url of objectUrlsRef.current) URL.revokeObjectURL(url);
    objectUrlsRef.current.clear();
  }, []);

  useEffect(() => {
    setHasCrypto(cryptoSupported());
    const current = Date.now();
    const initial = loadLogs(current);
    setLogs(initial);
    persistLogs(initial);
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setLogs((current) => {
      let changed = false;
      const next = current.map((entry) => {
        if (entry.expiresAt <= now && entry.shareUrl) {
          changed = true;
          const { shareUrl: _removed, ...expired } = entry;
          return expired;
        }
        return entry;
      });
      if (changed) persistLogs(next);
      return changed ? next : current;
    });
  }, [now]);

  useEffect(() => {
    const syncLocation = () => {
      const token = new URLSearchParams(window.location.search).get("share");
      const key = token === null ? null : new URLSearchParams(window.location.hash.slice(1)).get("key");
      setShareLocation((current) => current.token === token && current.key === key ? current : { token, key });
    };
    syncLocation();
    window.addEventListener("hashchange", syncLocation);
    window.addEventListener("popstate", syncLocation);
    return () => {
      window.removeEventListener("hashchange", syncLocation);
      window.removeEventListener("popstate", syncLocation);
    };
  }, []);

  useEffect(() => {
    const { token, key } = shareLocation;
    revokeViewedFiles();
    setViewed(null);
    setViewExpiresAt(null);
    if (token === null) {
      setViewerState("idle");
      return;
    }
    if (!TOKEN_PATTERN.test(token)) {
      setViewerState("not_found");
      return;
    }
    if (!key) {
      setViewerState("missing_key");
      return;
    }
    if (!serviceUrl || !cryptoSupported()) {
      setViewerState("failed");
      return;
    }

    const controller = new AbortController();
    setViewerState("loading");
    void (async () => {
      try {
        const data = await apiRequest(serviceUrl, `shares/${token}`, { method: "GET" }, controller.signal);
        if (
          typeof data.ciphertext !== "string"
          || typeof data.expires_at !== "number"
          || !Number.isSafeInteger(data.expires_at)
        ) {
          throw new ShareRequestError("invalid_response", 0);
        }
        const expiresAt = data.expires_at * 1000;
        if (expiresAt <= Date.now()) {
          setViewerState("expired");
          return;
        }
        const decrypted = await decryptShare(data.ciphertext, key);
        if (controller.signal.aborted) return;
        revokeViewedFiles();
        const attachments = decrypted.attachments.map((attachment) => {
          const bytes = new Uint8Array(attachment.bytes);
          const url = URL.createObjectURL(new Blob([bytes.buffer], { type: attachment.type }));
          objectUrlsRef.current.add(url);
          return { name: attachment.name, type: attachment.type, size: attachment.size, url };
        });
        setViewed({ text: decrypted.text, attachments });
        setViewExpiresAt(expiresAt);
        setViewerState("ready");
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          revokeViewedFiles();
          setViewed(null);
          setViewExpiresAt(null);
          setViewerState(viewerErrorState(error));
        }
      }
    })();
    return () => controller.abort();
  }, [revokeViewedFiles, serviceUrl, shareLocation]);

  useEffect(() => {
    if (viewExpiresAt !== null && viewExpiresAt <= now && viewerState === "ready") {
      revokeViewedFiles();
      setViewed(null);
      setViewerState("expired");
    }
  }, [now, revokeViewedFiles, viewExpiresAt, viewerState]);

  useEffect(() => {
    if (created && created.expiresAt <= now) {
      setCreated(null);
      setNotice(tr("shareResultExpired"));
    }
  }, [created, now, tr]);

  useEffect(() => () => revokeViewedFiles(), [revokeViewedFiles]);

  const totalFileBytes = files.reduce((sum, file) => sum + file.size, 0);
  const canCreate = Boolean(
    serviceUrl
    && hasCrypto
    && !creating
    && !created
    && (message.length > 0 || files.length > 0)
    && message.length <= MAX_SHARE_TEXT_LENGTH
    && files.length <= MAX_SHARE_FILES
    && totalFileBytes <= MAX_SHARE_FILE_BYTES,
  );

  function resetFileInput() {
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function selectFiles(selected: FileList | null) {
    const next = selected ? Array.from(selected).slice(0, MAX_SHARE_FILES + 1) : [];
    setFiles(next);
    resetFileInput();
    setNotice(
      next.length > MAX_SHARE_FILES
        ? tr("shareErrorTooManyFiles")
        : next.reduce((sum, file) => sum + file.size, 0) > MAX_SHARE_FILE_BYTES
          ? tr("shareErrorFilesTooLarge")
          : "",
    );
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    setCreated(null);
    const minutes = Number(expiration);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) {
      setNotice(tr("shareErrorExpiration"));
      return;
    }
    if (!canCreate || !serviceUrl) {
      setNotice(!serviceUrl ? tr("shareServiceUnavailable") : tr("shareErrorContent"));
      return;
    }

    setCreating(true);
    try {
      const encrypted = await encryptShare(message, files);
      const data = await apiRequest(serviceUrl, "shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ciphertext: encrypted.ciphertext, expires_in_seconds: minutes * 60 }),
      });
      if (
        typeof data.token !== "string"
        || !TOKEN_PATTERN.test(data.token)
        || typeof data.created_at !== "number"
        || typeof data.expires_at !== "number"
        || !Number.isSafeInteger(data.created_at)
        || !Number.isSafeInteger(data.expires_at)
      ) {
        throw new ShareRequestError("invalid_response", 0);
      }

      const url = new URL(window.location.href);
      url.search = "";
      url.hash = "";
      url.searchParams.set("share", data.token);
      url.hash = `key=${encrypted.key}`;
      const result = { shareUrl: url.href, createdAt: data.created_at * 1000, expiresAt: data.expires_at * 1000 };
      setCreated(result);
      const entry: ShareLogEntry = {
        id: createLocalId(),
        createdAt: result.createdAt,
        expiresAt: result.expiresAt,
        fileCount: files.length,
        totalBytes: totalFileBytes,
        shareUrl: result.shareUrl,
      };
      setLogs((current) => {
        const next = [entry, ...current].slice(0, 50);
        persistLogs(next);
        return next;
      });
      setMessage("");
      setFiles([]);
      resetFileInput();
      setNotice(tr("shareCreatedNotice"));
    } catch (error) {
      const code = error instanceof ShareRequestError ? error.code : error instanceof Error ? error.message : "";
      setNotice(
        code === "payload_too_large" || code === "files_too_large"
          ? tr("shareErrorFilesTooLarge")
          : code === "rate_limit_exceeded"
            ? tr("shareErrorRateLimited")
            : code === "crypto_unsupported"
              ? tr("shareCryptoUnsupported")
              : tr("shareErrorCreate"),
      );
    } finally {
      setCreating(false);
    }
  }

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(tr("shareCopied"));
    } catch {
      setNotice(tr("shareCopyFailed"));
    }
  }

  function clearLogs() {
    setLogs([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // The rendered list is still cleared.
    }
  }

  const date = (value: number) => new Date(value).toLocaleString(lang, { dateStyle: "medium", timeStyle: "short" });
  const viewer = shareLocation.token !== null;

  return (
    <main className="gamesShell shareShell">
      <section className="gamesHero shareHero">
        <Link className="gamesHeroBack" href="/">{tr("gamesBackHome")}</Link>
        <div className="gamesHeroInner shareHeroInner">
          <span className="gamesHeroEyebrow">{tr("shareEyebrow")}</span>
          <h1 className="gamesHeroTitle">{viewer ? tr("shareViewerTitle") : tr("shareTitle")}</h1>
          <p className="gamesHeroSubtitle">{viewer ? tr("shareViewerSubtitle") : tr("shareSubtitle")}</p>
          <div className="shareTrustRow" aria-label={tr("shareSecurityLabel")}>
            <span>AES-256-GCM</span>
            <span>{tr("shareKeyFragment")}</span>
            <span>{tr("shareAutoDestroy")}</span>
          </div>
        </div>
      </section>

      <div className="shareContent">
        <p className="shareSecurityNote">{tr("shareSecurityNote")}</p>

        {viewer ? (
          <section className="sharePanel shareViewerPanel" aria-labelledby="share-view-heading">
            <div className="sharePanelHeading">
              <div>
                <span className="sharePanelIndex">01 / {tr("shareViewerLabel")}</span>
                <h2 id="share-view-heading">{tr("shareViewerHeading")}</h2>
              </div>
              {viewerState === "ready" && viewExpiresAt ? (
                <div className="shareCountdown">
                  <span>{tr("shareExpiresIn")}</span>
                  <strong>{formatRemaining(viewExpiresAt - now)}</strong>
                </div>
              ) : null}
            </div>

            {viewerState === "loading" ? <div className="shareStateCard" role="status">{tr("shareDecrypting")}</div> : null}
            {viewerState === "ready" && viewed ? (
              <div className="shareViewedContent">
                <div className="shareViewedBlock">
                  <span className="shareFieldLabel">{tr("shareMessageLabel")}</span>
                  {viewed.text ? <p className="shareViewedText">{viewed.text}</p> : <p className="shareEmptyText">{tr("shareNoText")}</p>}
                </div>
                <div className="shareViewedBlock">
                  <span className="shareFieldLabel">{tr("shareAttachments")}</span>
                  {viewed.attachments.length ? (
                    <ul className="shareDownloadList">
                      {viewed.attachments.map((attachment, index) => (
                        <li key={`${attachment.name}-${index}`}>
                          <div><strong>{attachment.name}</strong><span>{attachment.type} · {formatBytes(attachment.size)}</span></div>
                          <a href={attachment.url} download={attachment.name}>{tr("shareDownload")}</a>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="shareEmptyText">{tr("shareNoAttachments")}</p>}
                </div>
              </div>
            ) : null}
            {!["idle", "loading", "ready"].includes(viewerState) ? (
              <div className={`shareStateCard shareStateCard-${viewerState}`} role="alert">
                <strong>{tr(`shareViewerState_${viewerState}`)}</strong>
                <span>{tr(`shareViewerHelp_${viewerState}`)}</span>
              </div>
            ) : null}
          </section>
        ) : (
          <>
            <section className="sharePanel" aria-labelledby="share-create-heading">
              <div className="sharePanelHeading">
                <div>
                  <span className="sharePanelIndex">01 / {tr("shareCreateLabel")}</span>
                  <h2 id="share-create-heading">{tr("shareCreateHeading")}</h2>
                </div>
                <span className={`shareServiceState ${serviceUrl && hasCrypto ? "shareServiceState-ready" : "shareServiceState-offline"}`}>
                  {serviceUrl && hasCrypto ? tr("shareReady") : tr("shareUnavailable")}
                </span>
              </div>
              <p className="sharePanelIntro">{tr("shareCreateIntro")}</p>

              <form onSubmit={create}>
                <label className="shareField">
                  <span>{tr("shareMessageLabel")}</span>
                  <textarea
                    maxLength={MAX_SHARE_TEXT_LENGTH}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder={tr("shareMessagePlaceholder")}
                    rows={7}
                    value={message}
                  />
                  <small>{message.length.toLocaleString(lang)} / {MAX_SHARE_TEXT_LENGTH.toLocaleString(lang)}</small>
                </label>

                <div className="shareUploadBox">
                  <div>
                    <span className="shareFieldLabel">{tr("shareAttachments")}</span>
                    <p>{tr("shareAttachmentHelp")}</p>
                  </div>
                  <input
                    className="shareFileInput"
                    id={fileInputId}
                    multiple
                    onChange={(event) => selectFiles(event.target.files)}
                    ref={fileInputRef}
                    type="file"
                  />
                  <label className="shareFileButton" htmlFor={fileInputId}>{tr("shareChooseFiles")}</label>
                </div>

                {files.length ? (
                  <ul className="shareSelectedFiles">
                    {files.map((file, index) => (
                      <li key={`${file.name}-${file.lastModified}-${index}`}>
                        <div><strong>{file.name}</strong><span>{file.type || "application/octet-stream"} · {formatBytes(file.size)}</span></div>
                        <button
                          type="button"
                          onClick={() => {
                            setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
                            resetFileInput();
                          }}
                        >
                          {tr("shareRemove")}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="shareLimitLine">
                  <span>{files.length}/{MAX_SHARE_FILES} {tr("shareFiles")}</span>
                  <span>{formatBytes(totalFileBytes)} / {formatBytes(MAX_SHARE_FILE_BYTES)}</span>
                </div>

                <fieldset className="shareExpiration">
                  <legend>{tr("shareExpirationLegend")}</legend>
                  <p>{tr("shareExpirationHelp")}</p>
                  <div className="sharePresetRow">
                    {EXPIRATION_PRESETS.map((minutes) => (
                      <button
                        className={expiration === String(minutes) ? "active" : ""}
                        key={minutes}
                        onClick={() => setExpiration(String(minutes))}
                        type="button"
                      >
                        {minutes < 60 ? `${minutes}m` : minutes < 1440 ? `${minutes / 60}h` : "24h"}
                      </button>
                    ))}
                  </div>
                  <label className="shareCustomExpiration">
                    <span>{tr("shareCustomMinutes")}</span>
                    <input min="1" max="1440" onChange={(event) => setExpiration(event.target.value)} step="1" type="number" value={expiration} />
                  </label>
                </fieldset>

                {!serviceUrl ? <p className="shareInlineWarning">{tr("shareServiceUnavailable")}</p> : null}
                {!hasCrypto ? <p className="shareInlineWarning">{tr("shareCryptoUnsupported")}</p> : null}
                <div className="shareSubmitRow">
                  <p aria-live="polite">{notice}</p>
                  <button className="sharePrimaryButton" disabled={!canCreate} type="submit">
                    {creating ? tr("shareEncrypting") : tr("shareCreateAction")}
                  </button>
                </div>
              </form>

              {created ? (
                <div className="shareResult" aria-live="polite">
                  <div className="shareResultHeading">
                    <div><span>{tr("shareResultLabel")}</span><h3>{tr("shareResultTitle")}</h3></div>
                    <span>{formatRemaining(created.expiresAt - now)}</span>
                  </div>
                  <label className="shareField">
                    <span>{tr("shareLink")}</span>
                    <textarea readOnly rows={3} value={created.shareUrl} />
                  </label>
                  <div className="shareResultActions">
                    <button className="sharePrimaryButton" onClick={() => void copy(created.shareUrl)} type="button">{tr("shareCopyLink")}</button>
                    <button className="shareQuietButton" onClick={() => { setCreated(null); setNotice(""); }} type="button">{tr("shareCreateAnother")}</button>
                  </div>
                </div>
              ) : null}
            </section>

            <section className="sharePanel shareLogPanel" aria-labelledby="share-log-heading">
              <div className="sharePanelHeading">
                <div>
                  <span className="sharePanelIndex">02 / {tr("shareLogLocalLabel")}</span>
                  <h2 id="share-log-heading">{tr("shareLogTitle")}</h2>
                </div>
                {logs.length ? <button className="shareQuietButton" onClick={clearLogs} type="button">{tr("shareClearLog")}</button> : null}
              </div>
              <p className="sharePanelIntro">{tr("shareLogIntro")}</p>
              {logs.length ? (
                <ol className="shareLogList">
                  {logs.map((entry) => {
                    const active = entry.expiresAt > now && Boolean(entry.shareUrl);
                    return (
                      <li key={entry.id}>
                        <div className="shareLogRail"><span /><i /></div>
                        <div className="shareLogBody">
                          <div className="shareLogTitle">
                            <strong>{date(entry.createdAt)}</strong>
                            <span className={active ? "active" : "expired"}>{tr(active ? "shareLogActive" : "shareLogExpired")}</span>
                          </div>
                          <p>{entry.fileCount} {tr("shareFiles")} · {formatBytes(entry.totalBytes)} · {tr("shareExpiresAt")} {date(entry.expiresAt)}</p>
                          {active && entry.shareUrl ? (
                            <button className="shareLogCopy" onClick={() => void copy(entry.shareUrl as string)} type="button">{tr("shareCopyLink")}</button>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              ) : <div className="shareEmptyLog">{tr("shareLogEmpty")}</div>}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
