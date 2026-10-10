export const currentRelease = {
  version: "2.20.7",
  date: "2026-10-10",
  image: "/updates/2.20.7.svg",
  titleKey: "release2207Title",
  itemKeys: ["release2207Search", "release2207Keyboard", "release2207Coverage"],
};

const SEEN_KEY = "hanazar.release-notice.seen";

export function hasSeenRelease(storage: Pick<Storage, "getItem">, version: string) {
  try { return storage.getItem(SEEN_KEY) === version; } catch { return false; }
}

export function markReleaseSeen(storage: Pick<Storage, "setItem">, version: string) {
  try { storage.setItem(SEEN_KEY, version); } catch { /* The current page still remembers the notice. */ }
}
