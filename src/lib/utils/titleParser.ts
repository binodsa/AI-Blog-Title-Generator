/**
 * Title parsing and validation utilities
 */

export function parseModelOutput(content: string): string[] {
    const cleanedContent = content
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
  
    try {
      const parsed = JSON.parse(cleanedContent) as { titles?: string[] };
      if (Array.isArray(parsed.titles)) {
        return parsed.titles.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch {
      // Fall back to line parsing when JSON is malformed.
    }
  
    return cleanedContent
      .split("\n")
      .map((line) => line.replace(/^\d+[\).\s-]*/, "").trim())
      .filter(Boolean);
  }
  
  export function normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }
  
  export function countOverlaps(
    nextTitles: string[],
    previousTitles: string[],
  ): number {
    const previousSet = new Set(previousTitles.map(normalizeTitle));
    return nextTitles.reduce(
      (count, title) => count + (previousSet.has(normalizeTitle(title)) ? 1 : 0),
      0,
    );
  }