import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { cleanUserInput, tokenizeTopic } from "@/lib/inputProcessing";
import type { GenerateTitlesRequest, GenerateTitlesResponse } from "@/types/blog";

function getFallbackTitles(topic: string): string[] {
  return [
    `10 Smart Ways to Succeed with ${topic}`,
    `The Practical 2026 Guide to ${topic}`,
    `How ${topic} Is Changing Real-World Results`,
    `What Most People Miss About ${topic}`,
    `${topic}: Strategies That Actually Work`,
  ];
}

function parseModelOutput(content: string): string[] {
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

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();
}

function countOverlaps(nextTitles: string[], previousTitles: string[]): number {
  const previousSet = new Set(previousTitles.map(normalizeTitle));
  return nextTitles.reduce(
    (count, title) => count + (previousSet.has(normalizeTitle(title)) ? 1 : 0),
    0,
  );
}

export async function POST(request: Request) {
  console.info("[/api/generate] Request received");
  const apiKey =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ??
    process.env.GOOGLE_GENERATIVE_ALAPI_KEY?.trim() ??
    "";

  console.info("[/api/generate] Gemini API key found", { hasKey: Boolean(apiKey) });

  let payload: GenerateTitlesRequest;
  try {
    payload = (await request.json()) as GenerateTitlesRequest;
  } catch {
    console.error("[/api/generate] Invalid JSON request body");
    return NextResponse.json(
      { error: "Invalid JSON request body." },
      { status: 400 }
    );
  }

  const cleanedTopic = cleanUserInput(payload.topic ?? "");
  const tone = cleanUserInput(payload.tone ?? "engaging") || "engaging";
  const isGenerateMore = Boolean(payload.generateMore);
  const existingTitles = payload.existingTitles ?? payload.previousTitles ?? [];
  const tokens = tokenizeTopic(cleanedTopic);
  console.info("[/api/generate] Input processed", {
    originalLength: (payload.topic ?? "").length,
    cleanedTopic,
    tokenCount: tokens.length,
  });

  if (tokens.length === 0) {
    console.error("[/api/generate] Topic missing after cleaning");
    return NextResponse.json({ error: "Topic is required." }, { status: 400 });
  }

  const fallbackTitles = getFallbackTitles(cleanedTopic);

  if (!apiKey) {
    console.error(
      "[/api/generate] Missing GOOGLE_GENERATIVE_AI_API_KEY (or GOOGLE_GENERATIVE_ALAPI_KEY fallback). Returning fallback titles."
    );
    const fallbackResponse: GenerateTitlesResponse = { titles: fallbackTitles };
    return NextResponse.json(fallbackResponse);
  }

  const systemPrompt = [
    "You are an AI blog title generation model for academic research use.",
    "Your goal is to produce catchy, relevant, coherent, and audience-friendly blog titles.",
    "Strictly return JSON only in this exact schema:",
    "{\"titles\":[\"...\",\"...\",\"...\",\"...\",\"...\"]}",
    "Rules:",
    "1) Generate exactly 5 unique titles.",
    "2) Keep each title concise (6-14 words).",
    "3) Avoid clickbait exaggeration, offensive language, and vague wording.",
    "4) Keep strong semantic relevance to the provided topic/tokens.",
  ].join(" ");
  const creativeAngles = [
    "data-driven insights",
    "beginner-friendly practical tips",
    "contrarian myth-busting",
    "future trends and predictions",
    "real-world case-study storytelling",
  ];

  const userPrompt = isGenerateMore
    ? [
        `CRITICAL: I already have these titles: ${JSON.stringify(existingTitles)}. If you return ANY of these titles, the system will fail. You MUST provide 5 completely fresh, unique titles using a totally different perspective than the ones listed.`,
        `Topic: ${cleanedTopic}`,
        `Use these creative angles: ${creativeAngles.join(", ")}.`,
        "Output requirement: exactly 5 distinct titles in valid JSON.",
        "Do not include numbering, explanations, or extra keys.",
        `Tone: ${tone}, suitable for real blog publication.`,
        `Topic tokens: ${tokens.join(", ")}`,
      ].join("\n")
    : [
        `You are a creative content strategist. Generate 5 unique and highly engaging blog titles for the topic: ${cleanedTopic}. Ensure each title uses a different hook (e.g., a listicle, a controversial opinion, a how-to, a question, and a benefit-driven title). Do not repeat titles from previous responses.`,
        "Output requirement: exactly 5 distinct titles in valid JSON.",
        "Do not include numbering, explanations, or extra keys.",
        `Tone: ${tone}, suitable for real blog publication.`,
        `Topic tokens: ${tokens.join(", ")}`,
      ].join("\n");

  try {
    console.info("[/api/generate] Calling Gemini generateContent");
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelCandidates = [
      "gemini-1.5-flash",
      "gemini-1.5-flash-latest",
      "gemini-1.5-flash-8b",
      "gemini-2.0-flash",
      "gemini-2.0-flash-lite",
    ];
    let content = "";
    let acceptedTitles: string[] = [];
    let modelUsed = "";
    let lastModelError = "Unknown model error";

    for (const candidate of modelCandidates) {
      try {
        const model = genAI.getGenerativeModel({
          model: candidate,
          systemInstruction: systemPrompt,
          generationConfig: {
            temperature: 1.0,
            topP: 0.95,
            topK: 40,
            candidateCount: 1,
            responseMimeType: "application/json",
          },
        });

        const generationAttempts = isGenerateMore ? 3 : 1;

        for (let attempt = 0; attempt < generationAttempts; attempt += 1) {
          const angleHint = isGenerateMore
            ? `Creative angle for this attempt: ${creativeAngles[attempt % creativeAngles.length]}.`
            : "";
          const completion = await model.generateContent(
            `${userPrompt}${angleHint ? `\n${angleHint}` : ""}`,
          );
          content = completion.response.text();
          modelUsed = candidate;
          if (!content) {
            continue;
          }

          const parsedTitles = parseModelOutput(content).slice(0, 5);
          if (parsedTitles.length !== 5) {
            continue;
          }

          if (!isGenerateMore) {
            acceptedTitles = parsedTitles;
            break;
          }

          const overlapCount = countOverlaps(parsedTitles, existingTitles);
          if (overlapCount === 0) {
            acceptedTitles = parsedTitles;
            break;
          }
        }

        if (acceptedTitles.length === 5) {
          break;
        }
      } catch (modelError) {
        lastModelError =
          modelError instanceof Error ? modelError.message : String(modelError);
        console.error("[/api/generate] Gemini model attempt failed", {
          candidate,
          modelError,
        });
      }
    }

    if (!content) {
      throw new Error(
        `All Gemini model candidates failed. Last error: ${lastModelError}`
      );
    }

    const parsedTitles =
      acceptedTitles.length === 5 ? acceptedTitles : parseModelOutput(content).slice(0, 5);
    const finalTitles =
      parsedTitles.length === 5 ? parsedTitles : fallbackTitles.slice(0, 5);
    console.info("[/api/generate] Gemini response parsed", {
      titlesReturned: parsedTitles.length,
      modelUsed,
    });

    const response: GenerateTitlesResponse = {
      titles: finalTitles,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[/api/generate] Gemini API error", {
      error,
      message:
        error instanceof Error ? error.message : "Unknown Gemini API failure",
    });
    const fallbackResponse: GenerateTitlesResponse = { titles: fallbackTitles };
    return NextResponse.json(fallbackResponse);
  }
}
