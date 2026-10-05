export const currentRelease = {
  version: "2.20.5",
  date: "2026-10-05",
  image: "/updates/2.20.5.svg",
  titleKey: "release2205Title",
  itemKeys: ["release2205Scroll", "release2205Interaction"],
};

const SEEN_KEY = "hanazar.release-notice.seen";

export function hasSeenRelease(storage: Pick<Storage, "getItem">, version: string) {
  try { return storage.getItem(SEEN_KEY) === version; } catch { return false; }
}

export function markReleaseSeen(storage: Pick<Storage, "setItem">, version: string) {
  try { storage.setItem(SEEN_KEY, version); } catch { /* The current page still remembers the notice. */ }
}
