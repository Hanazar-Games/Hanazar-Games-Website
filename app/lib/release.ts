export const currentRelease = {
  version: "2.20.6",
  date: "2026-10-09",
  image: "/updates/2.20.6.svg",
  titleKey: "release2206Title",
  itemKeys: ["release2206Archive", "release2206Reader", "release2206Qa"],
};

const SEEN_KEY = "hanazar.release-notice.seen";

export function hasSeenRelease(storage: Pick<Storage, "getItem">, version: string) {
  try { return storage.getItem(SEEN_KEY) === version; } catch { return false; }
}

export function markReleaseSeen(storage: Pick<Storage, "setItem">, version: string) {
  try { storage.setItem(SEEN_KEY, version); } catch { /* The current page still remembers the notice. */ }
}
