"use client";

import { useState } from "react";
import { Copy, ShieldCheck } from "lucide-react";
import {
  recordTitleMetadata,
  type TitleMetadataRecord,
} from "@/lib/blockchain";
import { appendSecuredTitleEntry } from "@/lib/securedHistory";
import type { GenerateTitlesResponse } from "@/types/blog";

export default function Home() {
  const [topic, setTopic] = useState("");
  const [generatedTitles, setGeneratedTitles] = useState<string[]>([]);
  const [certificates, setCertificates] = useState<
    Record<string, TitleMetadataRecord>
  >({});
  const [securingTitle, setSecuringTitle] = useState<string | null>(null);
  const [copiedTitle, setCopiedTitle] = useState<string | null>(null);
  const [normalizedTopic, setNormalizedTopic] = useState("");
  const [tokens, setTokens] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async (generateMore = false) => {
    setErrorMessage("");
    setIsLoading(true);
    console.info("[Home] Generate clicked", {
      topicLength: topic.length,
      topicPreview: topic.slice(0, 60),
    });

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic,
          generateMore,
          existingTitles: generateMore ? generatedTitles : undefined,
          nonce: Date.now() + Math.random(),
        }),
      });
      console.info("[Home] API response received", {
        status: response.status,
        ok: response.ok,
      });

      const data = (await response.json()) as
        | GenerateTitlesResponse
        | { error?: string; details?: string };

      if (!response.ok || !("titles" in data)) {
        console.error("[Home] Generation failed response", data);
        const message =
          "error" in data && data.error
            ? data.error
            : "Could not generate titles. Please try again.";
        setErrorMessage(message);
        setGeneratedTitles([]);
        setCertificates({});
        setNormalizedTopic("");
        setTokens([]);
        return;
      }

      if (generateMore) {
        setGeneratedTitles((titles) => [...titles, ...data.titles]);
      } else {
        setGeneratedTitles(data.titles);
        setCertificates({});
      }
      setNormalizedTopic("");
      setTokens([]);
      console.info("[Home] Titles generated successfully", {
        count: data.titles.length,
      });
    } catch (error) {
      console.error("[Home] Network/runtime error while generating", error);
      setErrorMessage("Network error while generating titles.");
      setGeneratedTitles([]);
      setCertificates({});
      setNormalizedTopic("");
      setTokens([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSecureToLedger = async (title: string) => {
    setSecuringTitle(title);
    try {
      const metadata = await recordTitleMetadata(title);
      appendSecuredTitleEntry(title, metadata);
      setCertificates((previous) => ({
        ...previous,
        [title]: metadata,
      }));
    } finally {
      setSecuringTitle(null);
    }
  };

  const handleCopyTitle = async (title: string) => {
    try {
      await navigator.clipboard.writeText(title);
      setCopiedTitle(title);
      setTimeout(() => {
        setCopiedTitle((current) => (current === title ? null : current));
      }, 2000);
    } catch (error) {
      console.error("[Home] Failed to copy title", error);
    }
  };

  return (
    <div className="min-h-screen bg-white px-6 py-16 font-sans text-black dark:bg-gray-900 dark:text-white">
      <main className="mx-auto flex w-full max-w-4xl justify-center">
        <section className="w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            AI-Powered Blog Title Generator
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            Enter a topic and generate blog title ideas.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="e.g., sustainable fashion"
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 outline-none transition focus:border-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-300"
            />
            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={isLoading}
              className="rounded-xl bg-zinc-900 px-5 py-3 font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
            >
              {isLoading ? "Generating..." : "Generate"}
            </button>
            {generatedTitles.length > 0 && (
              <button
                type="button"
                onClick={() => void handleGenerate(true)}
                disabled={isLoading}
                className="rounded-xl border border-zinc-300 bg-white px-5 py-3 font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
              >
                {isLoading ? "Generating..." : "Generate More"}
              </button>
            )}
          </div>

          <div className="mt-6">
            {errorMessage && (
              <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
                {errorMessage}
              </p>
            )}

            {normalizedTopic && (
              <div className="mb-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                <p>
                  <strong>Normalized topic:</strong> {normalizedTopic}
                </p>
                <p className="mt-1">
                  <strong>Tokens:</strong> {tokens.join(", ")}
                </p>
              </div>
            )}

            {generatedTitles.length > 0 ? (
              <ul className="space-y-2">
                {generatedTitles.map((title, index) => (
                  <li
                    key={`${title}-${index}`}
                    className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-4 text-sm text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm leading-6 text-zinc-800 dark:text-zinc-100">{title}</p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void handleCopyTitle(title)}
                          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-medium transition ${
                            copiedTitle === title
                              ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                              : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:border-zinc-500 dark:hover:bg-zinc-700 dark:hover:text-white"
                          }`}
                        >
                          <Copy className="h-3.5 w-3.5" />
                          {copiedTitle === title ? "Copied!" : "Copy"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleSecureToLedger(title)}
                          disabled={securingTitle === title}
                          className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                        >
                          <ShieldCheck className="h-4 w-4 text-emerald-600" />
                          {securingTitle === title
                            ? "Securing..."
                            : "Secure to Ledger"}
                        </button>
                      </div>
                    </div>

                    {certificates[title] && (
                      <div className="mt-4 rounded-lg border border-emerald-200 bg-white px-4 py-3 dark:border-emerald-700 dark:bg-zinc-800">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                          Digital Certificate
                        </p>
                        <div className="mt-2 space-y-1 text-xs text-zinc-700 dark:text-zinc-200">
                          <p className="break-all">
                            <span className="font-semibold text-zinc-900 dark:text-white">
                              Verified Hash:
                            </span>{" "}
                            {certificates[title].hash}
                          </p>
                          <p>
                            <span className="font-semibold text-zinc-900 dark:text-white">
                              Timestamp:
                            </span>{" "}
                            {certificates[title].timestamp}
                          </p>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Generated titles will appear here.
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
