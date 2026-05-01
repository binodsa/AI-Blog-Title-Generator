import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { cleanUserInput, tokenizeTopic } from "@/lib/inputProcessing";
import { parseModelOutput, countOverlaps } from "@/lib/utils/titleParser";
import { pickStyleConstraints } from "@/lib/utils/styleConstraints";
import { asProviderError } from "@/lib/utils/errorHandling";
import type {
  GenerateTitlesRequest,
  GenerateTitlesResponse,
} from "@/types/blog";

function getFallbackTitles(topic: string): string[] {
  return [
    `10 Smart Ways to Succeed with ${topic}`,
    `The Practical 2026 Guide to ${topic}`,
    `How ${topic} Is Changing Real-World Results`,
    `What Most People Miss About ${topic}`,
    `${topic}: Strategies That Actually Work`,
  ];
}

export async function POST(request: Request) {
  console.info("[/api/generate] Request received");
  const geminiApiKey =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ??
    process.env.GOOGLE_GENERATIVE_ALAPI_KEY?.trim() ??
    "";

  console.info("[/api/generate] API key found", {
    hasGeminiKey: Boolean(geminiApiKey),
  });

  let payload: GenerateTitlesRequest;
  try {
    payload = (await request.json()) as GenerateTitlesRequest;
  } catch {
    console.error("[/api/generate] Invalid JSON request body");
    return NextResponse.json(
      { error: "Invalid JSON request body." },
      { status: 400 },
    );
  }

  const cleanedTopic = cleanUserInput(payload.topic ?? "");
  const tone = cleanUserInput(payload.tone ?? "engaging") || "engaging";
  const isGenerateMore = Boolean(payload.generateMore);
  const existingTitles = payload.existingTitles ?? payload.previousTitles ?? [];
  const tokens = tokenizeTopic(cleanedTopic);
  const nonce =
    typeof payload.nonce === "number" && Number.isFinite(payload.nonce)
      ? payload.nonce
      : Date.now();
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

  if (!geminiApiKey) {
    console.error(
      "[/api/generate] Missing Gemini API key. Set GOOGLE_GENERATIVE_AI_API_KEY. Returning fallback titles.",
    );
    const fallbackResponse: GenerateTitlesResponse = { titles: fallbackTitles };
    return NextResponse.json(fallbackResponse);
  }

  const styleConstraints = pickStyleConstraints(nonce);

  const systemPrompt = [
    "You are an AI blog title generator.",
    "Your goal is to produce varied, non-templated, audience-friendly blog titles.",
    "Strictly return JSON only in this exact schema:",
    '{"titles":["...","...","...","...","..."]}',
    "Rules:",
    "1) Generate exactly 5 unique titles.",
    "2) Keep each title concise and natural (roughly 6-16 words).",
    "3) Avoid offensive language and vague wording.",
    "4) Keep strong semantic relevance to the provided topic/tokens.",
    "5) Do NOT use rigid templates; diversify phrasing and structure across the 5.",
  ].join(" ");

  const randomnessHint = [
    "Diversity requirements (treat as hard constraints):",
    `- Nonce (randomness seed): ${nonce}`,
    ...styleConstraints.map((rule) => `- ${rule}`),
  ].join("\n");

  const userPrompt = isGenerateMore
    ? [
        `CRITICAL: I already have these titles: ${JSON.stringify(existingTitles)}. If you return ANY of these titles, the system will fail. You MUST provide 5 completely fresh, unique titles using a totally different perspective than the ones listed.`,
        `Topic: ${cleanedTopic}`,
        "Output requirement: exactly 5 distinct titles in valid JSON.",
        "Do not include numbering, explanations, or extra keys.",
        `Tone: ${tone}, suitable for real blog publication.`,
        `Topic tokens: ${tokens.join(", ")}`,
        randomnessHint,
      ].join("\n")
    : [
        `Generate 5 unique and highly engaging blog titles for the topic: ${cleanedTopic}. Make the 5 titles feel like they were written by different editors (different structure, cadence, and framing).`,
        "Output requirement: exactly 5 distinct titles in valid JSON.",
        "Do not include numbering, explanations, or extra keys.",
        `Tone: ${tone}, suitable for real blog publication.`,
        `Topic tokens: ${tokens.join(", ")}`,
        randomnessHint,
      ].join("\n");

  try {
    console.info("[/api/generate] Calling Gemini generateContent");
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const modelCandidates = [
      "gemini-2.5-flash",
      "gemini-2.5-flash-lite",
      "gemini-1.5-flash",
      "gemini-3.1-flash-lite",
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
            ? `Extra diversity constraint for this attempt: ${styleConstraints[attempt % styleConstraints.length]}`
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
        `All Gemini model candidates failed. Last error: ${lastModelError}`,
      );
    }

    const parsedTitles =
      acceptedTitles.length === 5
        ? acceptedTitles
        : parseModelOutput(content).slice(0, 5);
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
    const providerError = asProviderError(error);
    console.error("[/api/generate] Gemini provider error", {
      error,
      status: providerError.status,
      message: providerError.message,
    });

    return NextResponse.json(
      {
        error: "Gemini provider request failed.",
        details: providerError.message,
      },
      { status: providerError.status },
    );
  }
}