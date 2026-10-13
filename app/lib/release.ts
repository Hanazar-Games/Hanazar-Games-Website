export const currentRelease = {
  version: "2.20.12",
  date: "2026-10-13",
  image: "/updates/2.20.12.svg",
  titleKey: "release22012Title",
  itemKeys: ["release22012Resources", "release22012Search", "release22012Preserved"],
};

const SEEN_KEY = "hanazar.release-notice.seen";

export function hasSeenRelease(storage: Pick<Storage, "getItem">, version: string) {
  try { return storage.getItem(SEEN_KEY) === version; } catch { return false; }
}

export function markReleaseSeen(storage: Pick<Storage, "setItem">, version: string) {
  try { storage.setItem(SEEN_KEY, version); } catch { /* The current page still remembers the notice. */ }
}
