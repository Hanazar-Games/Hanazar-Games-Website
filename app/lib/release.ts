export const currentRelease = {
  version: "2.20.2",
  date: "2026-09-30",
  image: "/updates/2.20.2.svg",
  titleKey: "release2202Title",
  itemKeys: ["release2202Ui", "release2202Modal"],
};

const SEEN_KEY = "hanazar.release-notice.seen";

export function hasSeenRelease(storage: Pick<Storage, "getItem">, version: string) {
  try { return storage.getItem(SEEN_KEY) === version; } catch { return false; }
}

export function markReleaseSeen(storage: Pick<Storage, "setItem">, version: string) {
  try { storage.setItem(SEEN_KEY, version); } catch { /* The current page still remembers the notice. */ }
}
