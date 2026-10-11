export const currentRelease = {
  version: "2.20.10",
  date: "2026-10-11",
  image: "/updates/2.20.10.svg",
  titleKey: "release22010Title",
  itemKeys: ["release22010Navigation", "release22010Return", "release22010Preserved"],
};

const SEEN_KEY = "hanazar.release-notice.seen";

export function hasSeenRelease(storage: Pick<Storage, "getItem">, version: string) {
  try { return storage.getItem(SEEN_KEY) === version; } catch { return false; }
}

export function markReleaseSeen(storage: Pick<Storage, "setItem">, version: string) {
  try { storage.setItem(SEEN_KEY, version); } catch { /* The current page still remembers the notice. */ }
}
