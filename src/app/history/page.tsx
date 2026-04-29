"use client";

import Link from "next/link";
import { useMemo } from "react";
import { getSecuredTitleHistory } from "@/lib/securedHistory";

function formatTimestamp(isoTime: string): string {
  const date = new Date(isoTime);
  if (Number.isNaN(date.getTime())) {
    return isoTime;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function HistoryPage() {
  const entries = useMemo(() => getSecuredTitleHistory(), []);

  return (
    <div className="min-h-screen bg-white px-6 py-16 font-sans text-black dark:bg-gray-900 dark:text-white">
      <main className="mx-auto w-full max-w-4xl">
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
                Secured Title History
              </h1>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                All blog titles that were secured to the ledger.
              </p>
            </div>
            <Link
              href="/"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-700"
            >
              Back to Generator
            </Link>
          </div>

          {entries.length === 0 ? (
            <p className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
              No secured titles yet. Go secure a title to see it here.
            </p>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
                <thead>
                  <tr>
                    <th className="border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-700 dark:border-zinc-700 dark:text-zinc-200">
                      Blog Title
                    </th>
                    <th className="border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-700 dark:border-zinc-700 dark:text-zinc-200">
                      Verified Hash
                    </th>
                    <th className="border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-700 dark:border-zinc-700 dark:text-zinc-200">
                      Formatted Timestamp
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={`${entry.hash}-${entry.timestamp}`}>
                      <td className="border-b border-zinc-100 px-3 py-3 align-top text-zinc-900 dark:border-zinc-700 dark:text-zinc-100">
                        {entry.title}
                      </td>
                      <td className="border-b border-zinc-100 px-3 py-3 align-top font-mono text-xs text-zinc-700 dark:border-zinc-700 dark:text-zinc-300">
                        {entry.hash}
                      </td>
                      <td className="border-b border-zinc-100 px-3 py-3 align-top text-zinc-700 dark:border-zinc-700 dark:text-zinc-300">
                        {formatTimestamp(entry.timestamp)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
