export const currentRelease = {
  version: "2.20.8",
  date: "2026-10-11",
  image: "/updates/2.20.8.svg",
  titleKey: "release2208Title",
  itemKeys: ["release2208Archive", "release2208Navigation", "release2208Audio"],
};

const SEEN_KEY = "hanazar.release-notice.seen";

export function hasSeenRelease(storage: Pick<Storage, "getItem">, version: string) {
  try { return storage.getItem(SEEN_KEY) === version; } catch { return false; }
}

export function markReleaseSeen(storage: Pick<Storage, "setItem">, version: string) {
  try { storage.setItem(SEEN_KEY, version); } catch { /* The current page still remembers the notice. */ }
}
