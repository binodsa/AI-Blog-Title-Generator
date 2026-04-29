import type { TitleMetadataRecord } from "@/lib/blockchain";

export type SecuredTitleHistoryEntry = {
  title: string;
  hash: string;
  timestamp: string;
  blockID: string;
};

const STORAGE_KEY = "secured-title-history";

export function getSecuredTitleHistory(): SecuredTitleHistoryEntry[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as SecuredTitleHistoryEntry[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (entry) =>
        Boolean(entry?.title) &&
        Boolean(entry?.hash) &&
        Boolean(entry?.timestamp) &&
        Boolean(entry?.blockID),
    );
  } catch {
    return [];
  }
}

export function saveSecuredTitleHistory(entries: SecuredTitleHistoryEntry[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function appendSecuredTitleEntry(
  title: string,
  metadata: TitleMetadataRecord,
) {
  const current = getSecuredTitleHistory();
  const nextEntry: SecuredTitleHistoryEntry = {
    title,
    hash: metadata.hash,
    timestamp: metadata.timestamp,
    blockID: metadata.blockID,
  };

  saveSecuredTitleHistory([nextEntry, ...current]);
}
