"use client";

import { useEffect, useState, useRef } from "react";
import {
  Copy,
  ShieldCheck,
  Download,
  Trash2,
  FileJson,
  Zap,
} from "lucide-react";
import {
  recordTitleMetadata,
  type TitleMetadataRecord,
} from "@/lib/blockchain";
import { appendSecuredTitleEntry } from "@/lib/securedHistory";
import { saveGeneratorDraft, loadGeneratorDraft } from "@/lib/generatorDraft";
import type { GenerateTitlesResponse } from "@/types/blog";

// Session storage key to track if this is the first load
const SESSION_FIRST_LOAD_KEY = "blog-generator-first-load";

export default function Home() {
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("professional");
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
  const [showNotification, setShowNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [stats, setStats] = useState({
    totalGenerated: 0,
    recentTopics: [] as string[],
  });
  const initRef = useRef(false);

  // Restore draft when navigating back, but not on fresh page load
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    // Check if this is first visit to the site in this browser session
    const isFirstLoad = !sessionStorage.getItem(SESSION_FIRST_LOAD_KEY);

    if (isFirstLoad) {
      // First load - start fresh, mark session
      sessionStorage.setItem(SESSION_FIRST_LOAD_KEY, "true");
    } else {
      // Coming back from another page - restore the draft
      const draft = loadGeneratorDraft();
      if (draft) {
        setTopic(draft.topic);
        setGeneratedTitles(draft.generatedTitles);
        setCertificates(draft.certificates);
      }
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Save draft as it changes (for navigation within session)
  useEffect(() => {
    if (!initRef.current) return; // Don't save until initialized
    saveGeneratorDraft({
      topic,
      generatedTitles,
      certificates,
    });
  }, [topic, generatedTitles, certificates]);

  const handleGenerate = async (generateMore = false) => {
    setErrorMessage("");
    setIsLoading(true);
    console.info("[Home] Generate clicked", {
      topicLength: topic.length,
      topicPreview: topic.slice(0, 60),
      tone,
    });

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic,
          tone,
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
        const primaryMessage =
          "error" in data && data.error
            ? data.error
            : "Could not generate titles. Please try again.";
        const detailsMessage =
          "details" in data && data.details ? `\n${data.details}` : "";
        setErrorMessage(`${primaryMessage}${detailsMessage}`);

        // Keep any previously generated titles on screen. This makes provider
        // outages/quota errors less disruptive for the user.
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

      // Update stats
      setStats((prev) => ({
        totalGenerated: prev.totalGenerated + 1,
        recentTopics: [
          topic,
          ...prev.recentTopics.filter((t) => t !== topic),
        ].slice(0, 5),
      }));

      showToast("Titles generated successfully!", "success");
      console.info("[Home] Titles generated successfully", {
        count: data.titles.length,
      });
    } catch (error) {
      console.error("[Home] Network/runtime error while generating", error);
      setErrorMessage("Network error while generating titles.");
      showToast("Failed to generate titles", "error");
      setNormalizedTopic("");
      setTokens([]);
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (message: string, type: "success" | "error") => {
    setShowNotification({ message, type });
    setTimeout(() => setShowNotification(null), 3000);
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
      showToast("Copied to clipboard!", "success");
      setTimeout(() => {
        setCopiedTitle((current) => (current === title ? null : current));
      }, 2000);
    } catch (error) {
      console.error("[Home] Failed to copy title", error);
      showToast("Failed to copy", "error");
    }
  };

  const handleCopyAllTitles = async () => {
    try {
      const formatted = generatedTitles
        .map((title, i) => `${i + 1}. ${title}`)
        .join("\n");
      await navigator.clipboard.writeText(formatted);
      showToast(`Copied all ${generatedTitles.length} titles!`, "success");
    } catch (error) {
      console.error("[Home] Failed to copy all titles", error);
      showToast("Failed to copy all titles", "error");
    }
  };

  const handleExport = (format: "markdown" | "csv") => {
    let content = "";
    if (format === "markdown") {
      content = `# Blog Titles for "${topic}"\n\n${generatedTitles.map((title, i) => `${i + 1}. ${title}`).join("\n")}`;
    } else {
      content = `Title,Topic,Tone,Secured\n${generatedTitles.map((title) => `"${title}","${topic}","${tone}",${Boolean(certificates[title])}`).join("\n")}`;
    }
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `blog-titles-${Date.now()}.${format === "markdown" ? "md" : "csv"}`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported as ${format}!`, "success");
  };

  const highlightKeywords = (text: string) => {
    if (!tokens.length) return text;

    let highlighted = text;
    tokens.forEach((token) => {
      const regex = new RegExp(`\\b${token}\\b`, "gi");
      highlighted = highlighted.replace(
        regex,
        `<mark className="bg-yellow-200 dark:bg-yellow-700">$&</mark>`,
      );
    });
    return highlighted;
  };

  const handleClearAll = () => {
    setTopic("");
    setGeneratedTitles([]);
    setCertificates({});
    setErrorMessage("");
    showToast("Cleared all fields", "success");
  };

  return (
    <div className="min-h-screen bg-white px-6 py-16 font-sans text-black dark:bg-gray-900 dark:text-white">
      {/* Toast Notification */}
      {showNotification && (
        <div
          className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg transition-all duration-300 ${
            showNotification.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
              : "border border-red-200 bg-red-50 text-red-800 dark:border-red-700 dark:bg-red-950 dark:text-red-300"
          }`}
        >
          {showNotification.message}
        </div>
      )}

      <main className="mx-auto flex w-full max-w-4xl justify-center">
        <section className="w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
                AI-Powered Blog Title Generator
              </h1>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                Enter a topic and generate blog title ideas.
              </p>
            </div>
            {generatedTitles.length > 0 && (
              <button
                onClick={handleClearAll}
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              >
                <Trash2 className="h-4 w-4" />
                Clear All
              </button>
            )}
          </div>

          {/* Stats Bar */}
          {stats.totalGenerated > 0 && (
            <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-600 dark:text-zinc-300">
                  Generated:{" "}
                  <span className="font-semibold text-zinc-900 dark:text-white">
                    {stats.totalGenerated}
                  </span>
                </span>
                {stats.recentTopics.length > 0 && (
                  <span className="text-zinc-600 dark:text-zinc-300">
                    Recent:{" "}
                    <span className="font-semibold text-zinc-900 dark:text-white">
                      {stats.recentTopics[0]}
                    </span>
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="e.g., sustainable fashion"
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 outline-none transition focus:border-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-300"
            />
            <select
              value={tone}
              onChange={(event) => setTone(event.target.value)}
              className="rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 outline-none transition focus:border-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-300"
            >
              <option value="professional">Professional</option>
              <option value="casual">Casual</option>
              <option value="humorous">Humorous</option>
              <option value="urgent">Urgent</option>
              <option value="educational">Educational</option>
            </select>
            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={isLoading}
              className="rounded-xl bg-zinc-900 px-5 py-3 font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Generating...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Generate
                </div>
              )}
            </button>
            {generatedTitles.length > 0 && (
              <button
                type="button"
                onClick={() => void handleGenerate(true)}
                disabled={isLoading}
                className="rounded-xl border border-zinc-300 bg-white px-5 py-3 font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
              >
                Generate More
              </button>
            )}
          </div>

          {/* Bulk Actions */}
          {generatedTitles.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={handleCopyAllTitles}
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              >
                <Copy className="h-4 w-4" />
                Copy All
              </button>
              <button
                onClick={() => handleExport("markdown")}
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              >
                <Download className="h-4 w-4" />
                Export MD
              </button>
              <button
                onClick={() => handleExport("csv")}
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
              >
                <FileJson className="h-4 w-4" />
                Export CSV
              </button>
            </div>
          )}

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
                    className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-4 text-sm text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 transition-all duration-300 hover:shadow-md"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1">
                        <p
                          className="text-sm leading-6 text-zinc-800 dark:text-zinc-100"
                          dangerouslySetInnerHTML={{
                            __html: highlightKeywords(title),
                          }}
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Copy Button */}
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

                        {/* Secure Button */}
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