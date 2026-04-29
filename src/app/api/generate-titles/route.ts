import OpenAI from "openai";
import { NextResponse } from "next/server";
import { normalizeTopic, tokenizeTopic } from "@/lib/inputProcessing";
import type {
  GenerateTitlesRequest,
  GenerateTitlesResponse,
  GeneratedTitle,
} from "@/types/blog";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function parseModelOutput(content: string): string[] {
  try {
    const parsed = JSON.parse(content) as { titles?: string[] };
    if (Array.isArray(parsed.titles)) {
      return parsed.titles.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch {
    // Fallback to line parsing if JSON output is not valid.
  }

  return content
    .split("\n")
    .map((line) => line.replace(/^\d+[\).\s-]*/, "").trim())
    .filter(Boolean);
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY in environment variables." },
      { status: 500 }
    );
  }

  let payload: GenerateTitlesRequest;
  try {
    payload = (await request.json()) as GenerateTitlesRequest;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body." },
      { status: 400 }
    );
  }

  const normalizedTopic = normalizeTopic(payload.topic ?? "");
  const tokens = tokenizeTopic(normalizedTopic);

  if (tokens.length === 0) {
    return NextResponse.json(
      { error: "Topic is required." },
      { status: 400 }
    );
  }

  const systemPrompt =
    "You are a high-quality blog title generation model. Return output as JSON only: {\"titles\": [\"...\", \"...\", \"...\", \"...\", \"...\"]}.";

  const userPrompt = [
    "Generate exactly 5 blog titles for the processed topic below.",
    "Balance relevance, creativity, and coherence.",
    "Keep each title concise and natural for real blog audiences.",
    `Normalized topic: "${normalizedTopic}"`,
    `Tokens: ${tokens.join(", ")}`,
  ].join("\n");

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.9,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content ?? "";
    const rawTitles = parseModelOutput(content).slice(0, 5);

    const titles: GeneratedTitle[] = rawTitles.map((title, index) => ({
      id: `${index + 1}`,
      text: title,
    }));

    const responseBody: GenerateTitlesResponse = {
      normalizedTopic,
      tokens,
      titles,
    };

    return NextResponse.json(responseBody);
  } catch {
    return NextResponse.json(
      { error: "Failed to generate titles from the model." },
      { status: 500 }
    );
  }
}
