"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MOODS, MoodId } from "@/components/MoodPicker";
import TimeCapsuleModal from "@/components/TimeCapsuleModal";

type Entry = {
  id: string;
  body: string | null;
  mood: MoodId | null;
  entry_date: string;
  locked_until: string | null;
  pages: { page_no: number; notebook_id: string } | { page_no: number; notebook_id: string }[] | null;
};

const moodMap = Object.fromEntries(MOODS.map((m) => [m.id, m]));

function isLocked(entry: Entry): boolean {
  return !!entry.locked_until && new Date(entry.locked_until) > new Date();
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function preview(body: string | null): string {
  if (!body?.trim()) return "No text on this page.";
  return body.length > 120 ? body.slice(0, 120) + "…" : body;
}

export default function MemoriesClient() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [capsuleEntry, setCapsuleEntry] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/entries?limit=100")
      .then((r) => r.json())
      .then(setEntries)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const onLocked = (entryId: string, until: string) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === entryId ? { ...e, locked_until: until } : e))
    );
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <span className="text-sm text-[var(--color-paper)]/40">Opening memory vault…</span>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="paper flex flex-1 flex-col items-center justify-center rounded-[var(--radius-page)] p-8 text-center shadow-[var(--shadow-page)]">
        <p className="text-xl text-[var(--color-ink)]" style={{ fontFamily: "var(--font-display)" }}>
          No memories yet.
        </p>
        <p className="mt-2 text-sm text-[var(--color-ink-soft)]">
          Start writing in your journal — every page becomes a memory.
        </p>
      </div>
    );
  }

  // Group by month
  const grouped: Record<string, Entry[]> = {};
  entries.forEach((e) => {
    const key = e.entry_date.slice(0, 7); // "2026-07"
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);
  });

  return (
    <>
      <div className="flex flex-col gap-6 pb-2">
        {Object.entries(grouped).map(([month, items]) => {
          const [y, m] = month.split("-");
          const label = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-AU", {
            month: "long",
            year: "numeric",
          });
          return (
            <div key={month}>
              {/* Month divider */}
              <div className="mb-3 flex items-center gap-3">
                <div className="h-px flex-1 bg-[var(--color-paper)]/15" />
                <span className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-paper)]/50">
                  {label}
                </span>
                <div className="h-px flex-1 bg-[var(--color-paper)]/15" />
              </div>

              <div className="flex flex-col gap-3">
                {items.map((entry, i) => {
                  const locked = isLocked(entry);
                  const mood = entry.mood ? moodMap[entry.mood] : null;
                  const pageNo = Array.isArray(entry.pages)
                    ? entry.pages[0]?.page_no
                    : entry.pages?.page_no;

                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <div
                        className={`paper relative rounded-[var(--radius-page)] p-4 shadow-[var(--shadow-page)] ${
                          locked ? "overflow-hidden" : ""
                        }`}
                      >
                        {/* Locked overlay */}
                        {locked && (
                          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-[var(--radius-page)] bg-[var(--color-paper-deep)]/90 backdrop-blur-sm">
                            <span className="text-3xl">⏳</span>
                            <p className="mt-2 text-xs font-medium text-[var(--color-ink)]">
                              Time Capsule
                            </p>
                            <p className="text-[10px] text-[var(--color-ink-soft)]">
                              Opens {new Date(entry.locked_until!).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                            </p>
                          </div>
                        )}

                        {/* Header */}
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-ink-soft)]/70">
                              {formatDate(entry.entry_date)}
                            </p>
                            {pageNo && (
                              <p className="text-[10px] text-[var(--color-ink-soft)]/50">
                                Page {pageNo}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {mood && (
                              <span title={mood.label} className="text-lg">{mood.glyph}</span>
                            )}
                            {/* Time capsule toggle */}
                            {!locked && (
                              <button
                                onClick={() => setCapsuleEntry(entry.id)}
                                title="Seal as time capsule"
                                className="text-base opacity-40 active:opacity-100"
                              >
                                ⏳
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Body preview */}
                        <p className="text-sm leading-relaxed text-[var(--color-ink-soft)]">
                          {preview(entry.body)}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {capsuleEntry && (
        <TimeCapsuleModal
          entryId={capsuleEntry}
          onClose={() => setCapsuleEntry(null)}
          onLocked={(until) => { onLocked(capsuleEntry, until); setCapsuleEntry(null); }}
        />
      )}
    </>
  );
}
