export const currentRelease = {
  version: "2.20.3",
  date: "2026-10-03",
  image: "/updates/2.20.3.svg",
  titleKey: "release2203Title",
  itemKeys: ["release2203Placement", "release2203Motion", "release2203Contrast"],
};

const SEEN_KEY = "hanazar.release-notice.seen";

export function hasSeenRelease(storage: Pick<Storage, "getItem">, version: string) {
  try { return storage.getItem(SEEN_KEY) === version; } catch { return false; }
}

export function markReleaseSeen(storage: Pick<Storage, "setItem">, version: string) {
  try { storage.setItem(SEEN_KEY, version); } catch { /* The current page still remembers the notice. */ }
}
