export const currentRelease = {
  version: "2.20.1",
  date: "2026-09-22",
  image: "/updates/2.20.1.svg",
  titleKey: "release2201Title",
  itemKeys: ["release2201Ui", "release2201Audio"],
};

const SEEN_KEY = "hanazar.release-notice.seen";

export function hasSeenRelease(storage: Pick<Storage, "getItem">, version: string) {
  try { return storage.getItem(SEEN_KEY) === version; } catch { return false; }
}

export function markReleaseSeen(storage: Pick<Storage, "setItem">, version: string) {
  try { storage.setItem(SEEN_KEY, version); } catch { /* The current page still remembers the notice. */ }
}
