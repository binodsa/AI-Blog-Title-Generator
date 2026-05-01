"use client";

import { useState } from "react";
import { registerOnLedger, type LedgerRecord } from "@/lib/blockchain";
import type { GenerateTitlesResponse } from "@/types/blog";

export function TitleGeneratorForm() {
  const [topic, setTopic] = useState("");
  const [generatedTitles, setGeneratedTitles] = useState<string[]>([]);
  const [certificates, setCertificates] = useState<Record<string, LedgerRecord>>(
    {}
  );
  const [verifyingTitle, setVerifyingTitle] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    setErrorMessage("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ topic }),
      });

      const data = (await response.json()) as
        | GenerateTitlesResponse
        | { error?: string };

      if (!response.ok || !("titles" in data)) {
        const message =
          "error" in data && data.error
            ? data.error
            : "Could not generate titles. Please try again.";
        setErrorMessage(message);
        setGeneratedTitles([]);
        setCertificates({});
        return;
      }

      setGeneratedTitles(data.titles);
      setCertificates({});
    } catch {
      setErrorMessage("Network error while generating titles.");
      setGeneratedTitles([]);
      setCertificates({});
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (title: string) => {
    setVerifyingTitle(title);
    try {
      const record = await registerOnLedger(title);
      setCertificates((previous) => ({
        ...previous,
        [title]: record,
      }));
    } finally {
      setVerifyingTitle(null);
    }
  };

  return (
    <section className="w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold text-zinc-900">
        AI-Powered Blog Title Generator
      </h1>
      <p className="mt-2 text-sm text-zinc-600">
        Enter a topic and generate blog title ideas.
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          placeholder="e.g., sustainable fashion"
          className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-zinc-900 outline-none transition focus:border-zinc-900"
        />
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isLoading}
          className="rounded-xl bg-zinc-900 px-5 py-3 font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          {isLoading ? "Generating..." : "Generate"}
        </button>
      </div>

      <div className="mt-6">
        {errorMessage && (
          <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </p>
        )}

        {generatedTitles.length > 0 ? (
          <ul className="space-y-2">
            {generatedTitles.map((title) => (
              <li
                key={title}
                className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-4 text-sm text-zinc-800"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <p className="text-sm leading-6 text-zinc-800">{title}</p>
                  <button
                    type="button"
                    onClick={() => void handleVerify(title)}
                    disabled={verifyingTitle === title || Boolean(certificates[title])}
                    className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      certificates[title]
                        ? "border border-emerald-300 bg-emerald-100 text-emerald-800"
                        : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"
                    }`}
                  >
                    {verifyingTitle === title
                      ? "Verifying..."
                      : certificates[title]
                        ? "Verified"
                        : "Verify"}
                  </button>
                </div>

                {certificates[title] && (
                  <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/30 px-4 py-3">
                    <div className="border-b border-emerald-100 pb-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                        Digital Certificate
                      </p>
                    </div>
                    <div className="mt-2 space-y-1 text-xs text-zinc-700">
                      <p className="break-all">
                        <span className="font-semibold text-zinc-900">Hash:</span>{" "}
                        {certificates[title].hash}
                      </p>
                      <p>
                        <span className="font-semibold text-zinc-900">
                          Registered:
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
          <p className="text-sm text-zinc-500">
            Generated titles will appear here.
          </p>
        )}
      </div>
    </section>
  );
}