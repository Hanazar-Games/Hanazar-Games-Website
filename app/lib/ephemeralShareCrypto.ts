const AAD = new TextEncoder().encode("hanazar-share-v1");

export const MAX_SHARE_TEXT_LENGTH = 50_000;
export const MAX_SHARE_FILES = 10;
export const MAX_SHARE_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_CIPHERTEXT_LENGTH = 8 * 1024 * 1024;

interface ShareManifest {
  v: 1;
  text: string;
  files: Array<{
    name: string;
    type: string;
    size: number;
    lastModified: number;
  }>;
}

export interface DecryptedAttachment {
  name: string;
  type: string;
  size: number;
  lastModified: number;
  bytes: Uint8Array;
}

export interface DecryptedShare {
  text: string;
  attachments: DecryptedAttachment[];
}

export interface EncryptedShare {
  ciphertext: string;
  key: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function safeAttachmentName(value: string) {
  return value
    .replace(/[\\/:*?"<>|\u0000-\u001f\u007f\u061c\u200e-\u200f\u202a-\u202e\u2066-\u2069]/gi, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180) || "download";
}

function safeType(value: string) {
  const cleaned = value.replace(/[\u0000-\u0020\u007f]/g, "").slice(0, 120);
  return cleaned || "application/octet-stream";
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 32_768;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function base64UrlToBytes(value: string, maximumLength = MAX_CIPHERTEXT_LENGTH) {
  if (
    value.length === 0
    || value.length > maximumLength
    || value.length % 4 === 1
    || !/^[A-Za-z0-9_-]+$/.test(value)
  ) {
    throw new Error("invalid_base64url");
  }
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function validateFiles(files: File[]) {
  if (files.length > MAX_SHARE_FILES) throw new Error("too_many_files");
  const total = files.reduce((sum, file) => sum + file.size, 0);
  if (!Number.isSafeInteger(total) || total > MAX_SHARE_FILE_BYTES) throw new Error("files_too_large");
}

async function serialize(text: string, files: File[]) {
  if (text.length > MAX_SHARE_TEXT_LENGTH) throw new Error("text_too_long");
  validateFiles(files);

  const manifest: ShareManifest = {
    v: 1,
    text,
    files: files.map((file) => ({
      name: safeAttachmentName(file.name),
      type: safeType(file.type),
      size: file.size,
      lastModified: Number.isSafeInteger(file.lastModified) && file.lastModified >= 0 ? file.lastModified : 0,
    })),
  };
  const manifestBytes = new TextEncoder().encode(JSON.stringify(manifest));
  const fileBytes: Uint8Array[] = [];
  for (const file of files) fileBytes.push(new Uint8Array(await file.arrayBuffer()));

  const total = 4 + manifestBytes.length + fileBytes.reduce((sum, bytes) => sum + bytes.length, 0);
  const payload = new Uint8Array(total);
  new DataView(payload.buffer).setUint32(0, manifestBytes.length, false);
  payload.set(manifestBytes, 4);
  let offset = 4 + manifestBytes.length;
  for (const bytes of fileBytes) {
    payload.set(bytes, offset);
    offset += bytes.length;
  }
  return payload;
}

function parseManifest(value: unknown): ShareManifest {
  if (!isRecord(value) || value.v !== 1 || typeof value.text !== "string" || !Array.isArray(value.files)) {
    throw new Error("invalid_payload");
  }
  if (value.text.length > MAX_SHARE_TEXT_LENGTH || value.files.length > MAX_SHARE_FILES) {
    throw new Error("invalid_payload");
  }

  const files = value.files.map((entry) => {
    if (
      !isRecord(entry)
      || typeof entry.name !== "string"
      || typeof entry.type !== "string"
      || !Number.isSafeInteger(entry.size)
      || (entry.size as number) < 0
      || !Number.isSafeInteger(entry.lastModified)
      || (entry.lastModified as number) < 0
    ) {
      throw new Error("invalid_payload");
    }
    return {
      name: safeAttachmentName(entry.name),
      type: safeType(entry.type),
      size: entry.size as number,
      lastModified: entry.lastModified as number,
    };
  });

  return { v: 1, text: value.text, files };
}

function deserialize(payload: Uint8Array): DecryptedShare {
  if (payload.length < 4) throw new Error("invalid_payload");
  const manifestLength = new DataView(payload.buffer, payload.byteOffset, payload.byteLength).getUint32(0, false);
  if (manifestLength === 0 || manifestLength > payload.length - 4) throw new Error("invalid_payload");

  let manifestValue: unknown;
  try {
    const manifestText = new TextDecoder("utf-8", { fatal: true }).decode(payload.subarray(4, 4 + manifestLength));
    manifestValue = JSON.parse(manifestText) as unknown;
  } catch {
    throw new Error("invalid_payload");
  }
  const manifest = parseManifest(manifestValue);
  const totalFileBytes = manifest.files.reduce((sum, file) => sum + file.size, 0);
  if (!Number.isSafeInteger(totalFileBytes) || totalFileBytes > MAX_SHARE_FILE_BYTES) {
    throw new Error("invalid_payload");
  }

  let offset = 4 + manifestLength;
  const attachments = manifest.files.map((file) => {
    const end = offset + file.size;
    if (end > payload.length) throw new Error("invalid_payload");
    const attachment = { ...file, bytes: payload.slice(offset, end) };
    offset = end;
    return attachment;
  });
  if (offset !== payload.length) throw new Error("invalid_payload");
  return { text: manifest.text, attachments };
}

export function cryptoSupported() {
  return typeof globalThis.crypto?.subtle !== "undefined" && typeof globalThis.crypto.getRandomValues === "function";
}

export async function encryptShare(text: string, files: File[]): Promise<EncryptedShare> {
  if (!cryptoSupported()) throw new Error("crypto_unsupported");
  const payload = await serialize(text, files);
  const keyBytes = crypto.getRandomValues(new Uint8Array(32));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["encrypt"]);
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: AAD }, key, payload));
  const combined = new Uint8Array(iv.length + encrypted.length);
  combined.set(iv);
  combined.set(encrypted, iv.length);
  return { ciphertext: bytesToBase64Url(combined), key: bytesToBase64Url(keyBytes) };
}

export async function decryptShare(ciphertext: string, encodedKey: string): Promise<DecryptedShare> {
  if (!cryptoSupported()) throw new Error("crypto_unsupported");
  const combined = base64UrlToBytes(ciphertext);
  const keyBytes = base64UrlToBytes(encodedKey, 64);
  if (combined.length < 29 || keyBytes.length !== 32) throw new Error("invalid_ciphertext");
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["decrypt"]);
  const decrypted = new Uint8Array(
    await crypto.subtle.decrypt({ name: "AES-GCM", iv, additionalData: AAD }, key, encrypted),
  );
  return deserialize(decrypted);
}
