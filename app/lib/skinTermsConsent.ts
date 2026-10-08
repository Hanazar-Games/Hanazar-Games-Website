import { serviceTerms } from "./skinServiceTerms";

export const consentStorageKey = "hanazar.skin-terms-consent.v1";
type ConsentStorage = Pick<Storage, "getItem" | "setItem" | "removeItem"> | null;

export function readTermsConsent(storage: ConsentStorage, now = Date.now()): number | null {
  try {
    const value = JSON.parse(storage?.getItem(consentStorageKey) ?? "null");
    if (!value || value.version !== serviceTerms.version || value.documentSha256 !== serviceTerms.pdfSha256) return null;
    return Number.isSafeInteger(value.acceptedAt) && value.acceptedAt > 0 && value.acceptedAt <= now
      ? value.acceptedAt : null;
  } catch { return null; }
}

export function saveTermsConsent(storage: ConsentStorage, read: boolean, risks: boolean, acceptedAt = Date.now()) {
  if (!storage || !read || !risks || !Number.isSafeInteger(acceptedAt) || acceptedAt <= 0) return false;
  try {
    storage.setItem(consentStorageKey, JSON.stringify({
      version: serviceTerms.version,
      documentSha256: serviceTerms.pdfSha256,
      acceptedAt,
    }));
    return readTermsConsent(storage, acceptedAt) === acceptedAt;
  } catch { return false; }
}

export function clearTermsConsent(storage: ConsentStorage) {
  if (!storage) return false;
  try {
    storage.removeItem(consentStorageKey);
    return storage.getItem(consentStorageKey) === null;
  } catch { return false; }
}
