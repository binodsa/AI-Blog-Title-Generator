import type { TitleMetadataRecord } from "@/lib/blockchain";

export type GeneratorDraft = {
  topic: string;
  generatedTitles: string[];
  certificates: Record<string, TitleMetadataRecord>;
};

const STORAGE_KEY = "generator-draft";

export function loadGeneratorDraft(): GeneratorDraft | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<GeneratorDraft> | null;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const topic = typeof parsed.topic === "string" ? parsed.topic : "";
    const generatedTitles = Array.isArray(parsed.generatedTitles)
      ? parsed.generatedTitles.filter((item): item is string => typeof item === "string")
      : [];
    const certificates =
      parsed.certificates && typeof parsed.certificates === "object"
        ? (parsed.certificates as Record<string, TitleMetadataRecord>)
        : {};

    return {
      topic,
      generatedTitles,
      certificates,
    };
  } catch {
    return null;
  }
}

export function saveGeneratorDraft(draft: GeneratorDraft) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
}