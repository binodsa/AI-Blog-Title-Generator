export function normalizeTopic(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function cleanUserInput(input: string): string {
  return normalizeTopic(input).slice(0, 200);
}

export function tokenizeTopic(normalizedTopic: string): string[] {
  if (!normalizedTopic) {
    return [];
  }

  return normalizedTopic.split(" ").filter(Boolean);
}