"use client";

import Link from "next/link";
import {
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { useTranslation } from "../hooks/useTranslation";

type ConnectionStatus =
  | "idle"
  | "gathering"
  | "waiting"
  | "connecting"
  | "connected"
  | "disconnected"
  | "failed";

interface PairingPayload {
  v: 1;
  type: "offer" | "answer";
  sdp: string;
}

interface ChatMessage {
  id: string;
  direction: "incoming" | "outgoing";
  author: string;
  text: string;
  time: number;
}

interface TransferRecord {
  id: string;
  direction: "incoming" | "outgoing";
  name: string;
  size: number;
  progress: number;
  status: "sending" | "receiving" | "ready" | "failed";
  url?: string;
}

interface IncomingFile {
  id: string;
  wireId: string;
  name: string;
  size: number;
  mime: string;
  chunks: ArrayBuffer[];
  received: number;
  lastProgress: number;
  rejected: boolean;
}

const PAIRING_PREFIX = "HZP1.";
const MAX_PAIRING_CODE_LENGTH = 1_000_000;
const MAX_MESSAGE_LENGTH = 4_000;
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const CHUNK_SIZE = 64 * 1024;
const BUFFER_HIGH_WATER = 1024 * 1024;
const BUFFER_LOW_WATER = 256 * 1024;
const MAX_MESSAGES = 200;
const MAX_TRANSFERS = 20;

const statusKeys: Record<ConnectionStatus, string> = {
  idle: "peerStatusIdle",
  gathering: "peerStatusGathering",
  waiting: "peerStatusWaiting",
  connecting: "peerStatusConnecting",
  connected: "peerStatusConnected",
  disconnected: "peerStatusDisconnected",
  failed: "peerStatusFailed",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function createId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function cleanName(value: string, fallback: string, maxLength = 80) {
  const cleaned = value
    .replace(/[\u0000-\u001f\u007f\u061c\u200e-\u200f\u202a-\u202e\u2066-\u2069]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.slice(0, maxLength) || fallback;
}

function cleanFileName(value: string) {
  return cleanName(value.replace(/[\\/:*?"<>|]/g, "_"), "download", 180);
}

function safeTimestamp(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 8.64e15
    ? value
    : Date.now();
}

function encodePairingCode(description: RTCSessionDescription) {
  const payload: PairingPayload = {
    v: 1,
    type: description.type as PairingPayload["type"],
    sdp: description.sdp,
  };
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `${PAIRING_PREFIX}${btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
}

function decodePairingCode(code: string): PairingPayload {
  const compact = code.trim().replace(/\s+/g, "");
  if (!compact.startsWith(PAIRING_PREFIX) || compact.length > MAX_PAIRING_CODE_LENGTH) {
    throw new Error("invalid pairing code");
  }
  const encoded = compact.slice(PAIRING_PREFIX.length);
  if (!encoded || !/^[A-Za-z0-9_-]+$/.test(encoded)) throw new Error("invalid pairing code");
  const padded = encoded.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(encoded.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
  if (
    !isRecord(parsed)
    || parsed.v !== 1
    || (parsed.type !== "offer" && parsed.type !== "answer")
    || typeof parsed.sdp !== "string"
    || parsed.sdp.length === 0
    || parsed.sdp.length > 750_000
  ) {
    throw new Error("invalid pairing code");
  }
  return parsed as unknown as PairingPayload;
}

function waitForIceGathering(peer: RTCPeerConnection) {
  if (peer.iceGatheringState === "complete") return Promise.resolve();
  return new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      peer.removeEventListener("icegatheringstatechange", handleState);
      resolve();
    };
    const handleState = () => {
      if (peer.iceGatheringState === "complete") finish();
    };
    const timeout = window.setTimeout(finish, 12_000);
    peer.addEventListener("icegatheringstatechange", handleState);
  });
}

function waitForChannelBuffer(channel: RTCDataChannel) {
  if (channel.readyState !== "open") return Promise.reject(new Error("channel closed"));
  if (channel.bufferedAmount <= BUFFER_HIGH_WATER) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const finish = (error?: Error) => {
      window.clearTimeout(timeout);
      channel.removeEventListener("bufferedamountlow", handleLow);
      channel.removeEventListener("close", handleClose);
      channel.removeEventListener("error", handleClose);
      if (error) reject(error);
      else resolve();
    };
    const handleLow = () => finish();
    const handleClose = () => finish(new Error("channel closed"));
    const timeout = window.setTimeout(() => finish(new Error("channel stalled")), 15_000);
    channel.addEventListener("bufferedamountlow", handleLow);
    channel.addEventListener("close", handleClose);
    channel.addEventListener("error", handleClose);
  });
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export default function PeerTransferApp() {
  const { tr, lang } = useTranslation();
  const fileInputId = useId();
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const incomingFileRef = useRef<IncomingFile | null>(null);
  const objectUrlsRef = useRef(new Set<string>());
  const transfersRef = useRef<TransferRecord[]>([]);
  const displayNameRef = useRef("");
  const trRef = useRef(tr);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [supported, setSupported] = useState(true);
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [displayName, setDisplayName] = useState("");
  const [peerName, setPeerName] = useState("");
  const [pairingCode, setPairingCode] = useState("");
  const [remoteCode, setRemoteCode] = useState("");
  const [pairingNotice, setPairingNotice] = useState("");
  const [messageDraft, setMessageDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const [isSendingFile, setIsSendingFile] = useState(false);
  const [activityNotice, setActivityNotice] = useState("");

  const connected = status === "connected" && channelRef.current?.readyState === "open";

  useEffect(() => {
    displayNameRef.current = cleanName(displayName, tr("peerGuest"), 40);
    trRef.current = tr;
  }, [displayName, tr]);

  const appendMessage = useCallback((message: ChatMessage) => {
    setMessages((current) => [...current, message].slice(-MAX_MESSAGES));
  }, []);

  const setTransferList = useCallback((next: TransferRecord[]) => {
    const kept = next.slice(-MAX_TRANSFERS);
    const keptUrls = new Set(kept.flatMap((item) => item.url ? [item.url] : []));
    for (const item of next.slice(0, Math.max(0, next.length - MAX_TRANSFERS))) {
      if (item.url && !keptUrls.has(item.url)) {
        URL.revokeObjectURL(item.url);
        objectUrlsRef.current.delete(item.url);
      }
    }
    transfersRef.current = kept;
    setTransfers(kept);
  }, []);

  const appendTransfer = useCallback((record: TransferRecord) => {
    setTransferList([...transfersRef.current, record]);
  }, [setTransferList]);

  const updateTransfer = useCallback((id: string, patch: Partial<TransferRecord>) => {
    const next = transfersRef.current.map((item) => item.id === id ? { ...item, ...patch } : item);
    transfersRef.current = next;
    setTransfers(next);
  }, []);

  const sendWire = useCallback((payload: Record<string, unknown>) => {
    const channel = channelRef.current;
    if (!channel || channel.readyState !== "open") throw new Error("channel closed");
    channel.send(JSON.stringify(payload));
  }, []);

  const rejectIncomingFile = useCallback((file: IncomingFile) => {
    file.chunks = [];
    file.rejected = true;
    updateTransfer(file.id, { status: "failed" });
    try {
      sendWire({ kind: "file-reject", id: file.wireId });
    } catch {
      // The local failure remains visible if the peer has already disconnected.
    }
  }, [sendWire, updateTransfer]);

  const handleIncomingData = useCallback((data: string | ArrayBuffer) => {
    if (data instanceof ArrayBuffer) {
      const file = incomingFileRef.current;
      if (!file || file.rejected) return;
      if (data.byteLength > CHUNK_SIZE * 2 || file.received + data.byteLength > file.size) {
        rejectIncomingFile(file);
        setActivityNotice(trRef.current("peerFileRejected"));
        return;
      }
      file.chunks.push(data);
      file.received += data.byteLength;
      const progress = file.size === 0 ? 100 : Math.round((file.received / file.size) * 100);
      if (progress - file.lastProgress >= 2 || progress === 100) {
        file.lastProgress = progress;
        updateTransfer(file.id, { progress });
      }
      return;
    }

    if (data.length > 12_000) return;
    let payload: unknown;
    try {
      payload = JSON.parse(data);
    } catch {
      return;
    }
    if (!isRecord(payload) || typeof payload.kind !== "string") return;

    if (payload.kind === "hello" && typeof payload.name === "string") {
      setPeerName(cleanName(payload.name, trRef.current("peerGuest"), 40));
      return;
    }

    if (
      payload.kind === "text"
      && typeof payload.id === "string"
      && typeof payload.sender === "string"
      && typeof payload.text === "string"
      && payload.text.length > 0
      && payload.text.length <= MAX_MESSAGE_LENGTH
    ) {
      appendMessage({
        id: createId(),
        direction: "incoming",
        author: cleanName(payload.sender, trRef.current("peerGuest"), 40),
        text: payload.text,
        time: safeTimestamp(payload.time),
      });
      return;
    }

    if (
      payload.kind === "file-start"
      && typeof payload.id === "string"
      && typeof payload.name === "string"
      && typeof payload.size === "number"
      && typeof payload.mime === "string"
    ) {
      if (payload.id.length === 0 || payload.id.length > 80) return;
      if (incomingFileRef.current && !incomingFileRef.current.rejected) {
        rejectIncomingFile(incomingFileRef.current);
      }
      const id = createId();
      const size = payload.size;
      const file: IncomingFile = {
        id,
        wireId: payload.id,
        name: cleanFileName(payload.name),
        size,
        mime: cleanName(payload.mime, "application/octet-stream", 120),
        chunks: [],
        received: 0,
        lastProgress: 0,
        rejected: !Number.isSafeInteger(size) || size < 0 || size > MAX_FILE_SIZE,
      };
      incomingFileRef.current = file;
      appendTransfer({
        id,
        direction: "incoming",
        name: file.name,
        size: Number.isFinite(size) && size >= 0 ? size : 0,
        progress: 0,
        status: file.rejected ? "failed" : "receiving",
      });
      if (file.rejected) {
        rejectIncomingFile(file);
        setActivityNotice(trRef.current("peerFileTooLarge"));
      }
      return;
    }

    if (payload.kind === "file-end" && typeof payload.id === "string") {
      const file = incomingFileRef.current;
      if (!file || file.wireId !== payload.id) return;
      incomingFileRef.current = null;
      if (file.rejected) return;
      if (file.received !== file.size) {
        rejectIncomingFile(file);
        setActivityNotice(trRef.current("peerFileRejected"));
        return;
      }
      const url = URL.createObjectURL(new Blob(file.chunks, { type: file.mime }));
      objectUrlsRef.current.add(url);
      updateTransfer(file.id, { progress: 100, status: "ready", url });
      setActivityNotice(trRef.current("peerFileReceived"));
      return;
    }

    if (payload.kind === "file-reject" && typeof payload.id === "string") {
      updateTransfer(payload.id, { status: "failed" });
      setActivityNotice(trRef.current("peerFileRejected"));
    }
  }, [appendMessage, appendTransfer, rejectIncomingFile, updateTransfer]);

  const attachChannel = useCallback((channel: RTCDataChannel) => {
    if (channelRef.current && channelRef.current !== channel) channelRef.current.close();
    channelRef.current = channel;
    channel.binaryType = "arraybuffer";
    channel.bufferedAmountLowThreshold = BUFFER_LOW_WATER;
    channel.onopen = () => {
      if (channelRef.current !== channel) return;
      setStatus("connected");
      setPairingNotice(trRef.current("peerConnectedNotice"));
      channel.send(JSON.stringify({ kind: "hello", name: displayNameRef.current }));
    };
    channel.onmessage = (event) => {
      if (typeof event.data === "string" || event.data instanceof ArrayBuffer) {
        handleIncomingData(event.data);
      }
    };
    channel.onerror = () => {
      if (channelRef.current === channel) setStatus("failed");
    };
    channel.onclose = () => {
      if (channelRef.current === channel) setStatus("disconnected");
    };
  }, [handleIncomingData]);

  const closePeer = useCallback(() => {
    const channel = channelRef.current;
    channelRef.current = null;
    if (channel) {
      channel.onopen = null;
      channel.onmessage = null;
      channel.onerror = null;
      channel.onclose = null;
      channel.close();
    }
    const peer = peerRef.current;
    peerRef.current = null;
    if (peer) {
      peer.onconnectionstatechange = null;
      peer.ondatachannel = null;
      peer.close();
    }
    if (incomingFileRef.current) {
      incomingFileRef.current.chunks = [];
      incomingFileRef.current = null;
    }
    setIsSendingFile(false);
    setPeerName("");
  }, []);

  const createPeer = useCallback(() => {
    if (typeof RTCPeerConnection === "undefined") throw new Error("unsupported");
    const peer = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.cloudflare.com:3478" },
        { urls: "stun:stun.l.google.com:19302" },
      ],
    });
    peerRef.current = peer;
    peer.ondatachannel = (event) => attachChannel(event.channel);
    peer.onconnectionstatechange = () => {
      if (peerRef.current !== peer) return;
      if (peer.connectionState === "failed") setStatus("failed");
      else if (peer.connectionState === "disconnected") setStatus("disconnected");
      else if (peer.connectionState === "connected" && channelRef.current?.readyState === "open") {
        setStatus("connected");
      }
    };
    return peer;
  }, [attachChannel]);

  useEffect(() => {
    setSupported(typeof RTCPeerConnection !== "undefined");
    return () => {
      closePeer();
      for (const url of objectUrlsRef.current) URL.revokeObjectURL(url);
      objectUrlsRef.current.clear();
    };
  }, [closePeer]);

  useEffect(() => {
    const channel = channelRef.current;
    if (channel?.readyState === "open") {
      channel.send(JSON.stringify({ kind: "hello", name: displayNameRef.current }));
    }
  }, [displayName]);

  const createOffer = async () => {
    closePeer();
    setPairingCode("");
    setRemoteCode("");
    setPairingNotice("");
    setStatus("gathering");
    try {
      const peer = createPeer();
      const channel = peer.createDataChannel("hanazar-peer", { ordered: true });
      attachChannel(channel);
      await peer.setLocalDescription(await peer.createOffer());
      await waitForIceGathering(peer);
      if (peerRef.current !== peer || !peer.localDescription) return;
      setPairingCode(encodePairingCode(peer.localDescription));
      setStatus("waiting");
      setPairingNotice(tr("peerOfferReady"));
    } catch {
      closePeer();
      setStatus("failed");
      setPairingNotice(tr("peerConnectionError"));
    }
  };

  const applyRemoteCode = async () => {
    setPairingNotice("");
    let payload: PairingPayload;
    try {
      payload = decodePairingCode(remoteCode);
    } catch {
      setPairingNotice(tr("peerInvalidCode"));
      return;
    }

    try {
      if (payload.type === "offer") {
        closePeer();
        setPairingCode("");
        setStatus("gathering");
        const peer = createPeer();
        await peer.setRemoteDescription({ type: "offer", sdp: payload.sdp });
        await peer.setLocalDescription(await peer.createAnswer());
        await waitForIceGathering(peer);
        if (peerRef.current !== peer || !peer.localDescription) return;
        setPairingCode(encodePairingCode(peer.localDescription));
        setRemoteCode("");
        setStatus("connecting");
        setPairingNotice(tr("peerAnswerReady"));
        return;
      }

      const peer = peerRef.current;
      if (!peer || peer.signalingState !== "have-local-offer") {
        setPairingNotice(tr("peerAnswerNeedsOffer"));
        return;
      }
      setStatus("connecting");
      await peer.setRemoteDescription({ type: "answer", sdp: payload.sdp });
      setRemoteCode("");
      setPairingNotice(tr("peerConnectingNotice"));
    } catch {
      setStatus("failed");
      setPairingNotice(tr("peerConnectionError"));
    }
  };

  const resetConnection = () => {
    closePeer();
    setPairingCode("");
    setRemoteCode("");
    setPairingNotice("");
    setStatus("idle");
  };

  const copyPairingCode = async () => {
    if (!pairingCode) return;
    try {
      await navigator.clipboard.writeText(pairingCode);
      setPairingNotice(tr("peerCopied"));
    } catch {
      setPairingNotice(tr("peerCopyFailed"));
    }
  };

  const sendMessage = (event: FormEvent) => {
    event.preventDefault();
    const text = messageDraft.trim();
    if (!text || text.length > MAX_MESSAGE_LENGTH) return;
    const author = cleanName(displayName, tr("peerYou"), 40);
    const message: ChatMessage = {
      id: createId(),
      direction: "outgoing",
      author,
      text,
      time: Date.now(),
    };
    try {
      sendWire({ kind: "text", ...message, sender: author });
      appendMessage(message);
      setMessageDraft("");
      setActivityNotice("");
    } catch {
      setActivityNotice(tr("peerConnectionNeeded"));
    }
  };

  const handleMessageKeys = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  const sendFile = async () => {
    const file = selectedFile;
    const channel = channelRef.current;
    if (!file || !channel || channel.readyState !== "open" || isSendingFile) return;
    if (file.size > MAX_FILE_SIZE) {
      setActivityNotice(tr("peerFileTooLarge"));
      return;
    }

    const id = createId();
    const name = cleanFileName(file.name);
    setIsSendingFile(true);
    setActivityNotice("");
    appendTransfer({ id, direction: "outgoing", name, size: file.size, progress: 0, status: "sending" });
    try {
      sendWire({
        kind: "file-start",
        id,
        name,
        size: file.size,
        mime: file.type || "application/octet-stream",
      });
      let sent = 0;
      let lastProgress = 0;
      while (sent < file.size) {
        await waitForChannelBuffer(channel);
        const buffer = await file.slice(sent, sent + CHUNK_SIZE).arrayBuffer();
        if (channel.readyState !== "open") throw new Error("channel closed");
        channel.send(buffer);
        sent += buffer.byteLength;
        const progress = file.size === 0 ? 100 : Math.round((sent / file.size) * 100);
        if (progress - lastProgress >= 2 || progress === 100) {
          lastProgress = progress;
          updateTransfer(id, { progress });
        }
      }
      await waitForChannelBuffer(channel);
      sendWire({ kind: "file-end", id });
      updateTransfer(id, { progress: 100, status: "ready" });
      setActivityNotice(tr("peerFileSent"));
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      updateTransfer(id, { status: "failed" });
      setActivityNotice(tr("peerFileSendFailed"));
    } finally {
      setIsSendingFile(false);
    }
  };

  const downloadTranscript = () => {
    const lines = [
      "Hanazar File Transfer Assistant",
      new Date().toISOString(),
      "",
      ...messages.map((message) => (
        `[${new Date(message.time).toISOString()}] ${message.author}: ${message.text}`
      )),
      ...(transfers.length ? [
        "",
        "Files",
        ...transfers.map((file) => (
          `${file.direction === "outgoing" ? "Sent" : "Received"}: ${file.name} (${formatBytes(file.size)}) — ${file.status}`
        )),
      ] : []),
    ];
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `hanazar-transfer-${new Date().toISOString().slice(0, 10)}.txt`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const titleKey = "peerTransferTitle";
  const hasTranscript = messages.length > 0 || transfers.length > 0;

  return (
    <main className="pageShell gamesShell peerShell">
      <section className="gamesHero peerHero peerHero-transfer">
        <Link href="/" className="gamesHeroBack">
          {tr("gamesBackHome")}
        </Link>
        <div className="gamesHeroInner peerHeroInner">
          <span className="gamesHeroEyebrow">
            {tr("peerTransferEyebrow")}
          </span>
          <div className={`peerStatus peerStatus-${status}`} role="status" aria-live="polite">
            <span aria-hidden="true" />
            {tr(statusKeys[status])}
          </div>
          <h1 className="gamesHeroTitle">{tr(titleKey)}</h1>
          <p className="gamesHeroSubtitle">
            {tr("peerTransferSubtitle")}
          </p>
        </div>
      </section>

      <section className="peerContent" aria-label={tr(titleKey)}>
        <p className="peerPrivacyNote">{tr("peerPrivacyNote")}</p>

        <article className="peerCard peerPairingCard">
          <div className="peerCardHeading">
            <div>
              <span className="peerCardIndex">01</span>
              <h2>{tr("peerPairingTitle")}</h2>
            </div>
            <button className="peerButton peerButtonQuiet" type="button" onClick={resetConnection}>
              {tr("peerReset")}
            </button>
          </div>
          <p className="peerCardIntro">{tr("peerPairingHelp")}</p>

          <label className="peerField peerNameField">
            <span>{tr("peerYourName")}</span>
            <input
              type="text"
              value={displayName}
              maxLength={40}
              autoComplete="nickname"
              placeholder={tr("peerNamePlaceholder")}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </label>

          <div className="peerPairingGrid">
            <div className="peerPairingStep">
              <span className="peerStepLabel">{tr("peerHostStep")}</span>
              <button
                className="peerButton peerButtonPrimary"
                type="button"
                onClick={createOffer}
                disabled={!supported || status === "gathering" || connected}
              >
                {status === "gathering" ? tr("peerCreatingCode") : tr("peerCreateCode")}
              </button>
              <label className="peerField">
                <span>{tr("peerLocalCode")}</span>
                <textarea
                  value={pairingCode}
                  readOnly
                  rows={5}
                  spellCheck={false}
                  placeholder={tr("peerLocalCodePlaceholder")}
                />
              </label>
              <button
                className="peerButton"
                type="button"
                onClick={copyPairingCode}
                disabled={!pairingCode}
              >
                {tr("peerCopyCode")}
              </button>
            </div>

            <div className="peerPairingStep">
              <span className="peerStepLabel">{tr("peerRemoteStep")}</span>
              <label className="peerField">
                <span>{tr("peerRemoteCode")}</span>
                <textarea
                  value={remoteCode}
                  rows={7}
                  spellCheck={false}
                  autoCapitalize="off"
                  autoCorrect="off"
                  placeholder={tr("peerRemoteCodePlaceholder")}
                  onChange={(event) => setRemoteCode(event.target.value.slice(0, MAX_PAIRING_CODE_LENGTH))}
                />
              </label>
              <button
                className="peerButton peerButtonPrimary"
                type="button"
                onClick={applyRemoteCode}
                disabled={!supported || !remoteCode.trim() || status === "gathering" || connected}
              >
                {tr("peerUseCode")}
              </button>
            </div>
          </div>

          <p className="peerLiveNotice" role="status" aria-live="polite">
            {!supported ? tr("peerUnsupported") : pairingNotice}
          </p>
        </article>

        <div className="peerWorkspace">
          <article className="peerCard peerMessageCard">
            <div className="peerCardHeading">
              <div>
                <span className="peerCardIndex">02</span>
                <h2>{tr("peerMessagesTitle")}</h2>
              </div>
              <span className="peerPeerName">{peerName || tr("peerGuest")}</span>
            </div>

            <div className="peerMessageLog" role="log" aria-live="polite" aria-relevant="additions text">
              {messages.length === 0 ? (
                <p className="peerEmptyState">{tr("peerMessageEmpty")}</p>
              ) : messages.map((message) => (
                <div className={`peerMessage peerMessage-${message.direction}`} key={`${message.direction}-${message.id}`}>
                  <div className="peerMessageMeta">
                    <strong>{message.author}</strong>
                    <time dateTime={new Date(message.time).toISOString()}>
                      {new Date(message.time).toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" })}
                    </time>
                  </div>
                  <p>{message.text}</p>
                </div>
              ))}
            </div>

            <form className="peerComposer" onSubmit={sendMessage}>
              <label className="peerField">
                <span>{tr("peerMessageLabel")}</span>
                <textarea
                  value={messageDraft}
                  rows={3}
                  maxLength={MAX_MESSAGE_LENGTH}
                  placeholder={connected ? tr("peerMessagePlaceholder") : tr("peerConnectionNeeded")}
                  disabled={!connected}
                  onChange={(event) => setMessageDraft(event.target.value)}
                  onKeyDown={handleMessageKeys}
                />
              </label>
              <div className="peerComposerActions">
                <span>{messageDraft.length}/{MAX_MESSAGE_LENGTH}</span>
                <button className="peerButton peerButtonPrimary" type="submit" disabled={!connected || !messageDraft.trim()}>
                  {tr("peerSendMessage")}
                </button>
              </div>
            </form>
          </article>

          <article className="peerCard peerFileCard">
              <div className="peerCardHeading">
                <div>
                  <span className="peerCardIndex">03</span>
                  <h2>{tr("peerFilesTitle")}</h2>
                </div>
                <span className="peerFileLimit">{tr("peerFileLimit")}</span>
              </div>

              <div className="peerFileControls">
                <input
                  ref={fileInputRef}
                  className="peerFileInput"
                  id={fileInputId}
                  type="file"
                  disabled={!connected || isSendingFile}
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setSelectedFile(file);
                    setActivityNotice(file && file.size > MAX_FILE_SIZE ? tr("peerFileTooLarge") : "");
                  }}
                />
                <label
                  className="peerFilePicker"
                  htmlFor={fileInputId}
                  aria-disabled={!connected || isSendingFile}
                >
                  {selectedFile ? selectedFile.name : tr("peerChooseFile")}
                </label>
                <button
                  className="peerButton peerButtonPrimary"
                  type="button"
                  onClick={sendFile}
                  disabled={!connected || !selectedFile || isSendingFile || Boolean(selectedFile && selectedFile.size > MAX_FILE_SIZE)}
                >
                  {isSendingFile ? tr("peerFileSending") : tr("peerSendFile")}
                </button>
              </div>

              <div className="peerTransferList" aria-live="polite">
                {transfers.length === 0 ? (
                  <p className="peerEmptyState">{tr("peerFileEmpty")}</p>
                ) : transfers.map((file) => (
                  <div className="peerTransferItem" key={`${file.direction}-${file.id}`}>
                    <div className="peerTransferMeta">
                      <strong title={file.name}>{file.name}</strong>
                      <span>{formatBytes(file.size)} · {tr(`peerFileStatus${file.status[0].toUpperCase()}${file.status.slice(1)}`)}</span>
                    </div>
                    <progress value={file.progress} max={100}>{file.progress}%</progress>
                    <div className="peerTransferBottom">
                      <span>{file.progress}%</span>
                      {file.direction === "incoming" && file.status === "ready" && file.url ? (
                        <a href={file.url} download={file.name}>{tr("peerDownloadFile")}</a>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
          </article>
        </div>

        <div className="peerFooterActions">
          <p className="peerLiveNotice" role="status" aria-live="polite">{activityNotice}</p>
          <button className="peerButton" type="button" onClick={downloadTranscript} disabled={!hasTranscript}>
            {tr("peerDownloadTranscript")}
          </button>
        </div>
      </section>
    </main>
  );
}
