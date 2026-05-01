import type { GeneratedTitle } from "@/types/blog";

export function generateMockTitles(topic: string): GeneratedTitle[] {
  const normalizedTopic = topic.trim();

  if (!normalizedTopic) {
    return [];
  }

  return [
    {
      id: "1",
      text: `10 Practical Ways to Master ${normalizedTopic}`,
    },
    {
      id: "2",
      text: `The Beginner's Guide to ${normalizedTopic} in 2026`,
    },
    {
      id: "3",
      text: `What Nobody Tells You About ${normalizedTopic}`,
    },
  ];
}