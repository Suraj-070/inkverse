"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

type Insight = {
  headline: string;
  patterns: string[];
  mood_summary: string;
  growth_moment: string;
  prompt_for_next_week: string;
};

export default function WeeklyInsight() {
  const [insight, setInsight] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fetched, setFetched] = useState(false);

  const fetch_ = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai/weekly");
      if (!res.ok) {
        const e = await res.json();
        setError(e.error ?? "Failed");
        return;
      }
      setInsight(await res.json());
    } catch {
      setError("Request failed");
    } finally {
      setLoading(false);
      setFetched(true);
    }
  };

  // Auto-fetch on mount
  useEffect(() => { fetch_(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!fetched && loading) {
    return (
      <div className="paper rounded-[var(--radius-page)] p-5 shadow-[var(--shadow-page)]">
        <div className="flex items-center gap-2 text-sm text-[var(--color-ink-soft)]">
          <span className="animate-pulse">✦</span> Reflecting on your week…
        </div>
      </div>
    );
  }

  if (error && !insight) {
    return (
      <div className="paper rounded-[var(--radius-page)] p-5 shadow-[var(--shadow-page)]">
        <p className="text-xs text-[var(--color-ink-soft)]">
          {error === "Not enough entries for weekly insight"
            ? "Write a few more entries to unlock weekly insights."
            : `Couldn't load weekly insight: ${error}`}
        </p>
        {error !== "Not enough entries for weekly insight" && (
          <button onClick={fetch_} className="mt-2 text-xs underline text-[var(--color-ink-soft)]">
            Retry
          </button>
        )}
      </div>
    );
  }

  if (!insight) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="paper rounded-[var(--radius-page)] p-5 shadow-[var(--shadow-page)]"
    >
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-[var(--color-ink-soft)]/60">
            ✦ Weekly reflection
          </p>
          <h2
            className="mt-1 text-lg font-semibold leading-snug text-[var(--color-ink)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {insight.headline}
          </h2>
        </div>
        <button
          onClick={fetch_}
          disabled={loading}
          className="shrink-0 text-lg opacity-40 active:opacity-100 disabled:animate-spin"
          title="Refresh"
        >
          ↺
        </button>
      </div>

      {/* Patterns */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {insight.patterns.map((p) => (
          <span
            key={p}
            className="rounded-full bg-[var(--color-ink)]/8 px-2.5 py-1 text-xs text-[var(--color-ink-soft)]"
          >
            {p}
          </span>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-[var(--color-ink-soft)]/50 mb-0.5">
            Mood arc
          </p>
          <p className="text-sm leading-relaxed text-[var(--color-ink-soft)]">
            {insight.mood_summary}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-[var(--color-ink-soft)]/50 mb-0.5">
            Growth moment
          </p>
          <p className="text-sm leading-relaxed text-[var(--color-ink-soft)]">
            {insight.growth_moment}
          </p>
        </div>
        <div className="rounded-xl bg-[var(--color-paper-deep)] px-4 py-3">
          <p className="text-[10px] uppercase tracking-widest text-[var(--color-ink-soft)]/50 mb-1">
            Carry into next week
          </p>
          <p className="text-sm leading-relaxed text-[var(--color-ink)] italic">
            "{insight.prompt_for_next_week}"
          </p>
        </div>
      </div>
    </motion.div>
  );
}
