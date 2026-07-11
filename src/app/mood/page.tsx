"use client";

import { useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";
import MoodPicker, { MoodId } from "@/components/MoodPicker";
import MoodChart from "@/components/MoodChart";

type MoodRow = { id: string; mood: MoodId; note: string | null; mood_date: string };

export default function MoodPage() {
  const [moods, setMoods] = useState<MoodRow[]>([]);
  const [loading, setLoading] = useState(true);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayMood = moods.find((m) => m.mood_date === todayStr);

  useEffect(() => {
    fetch("/api/moods?months=3")
      .then((r) => r.json())
      .then(setMoods)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (mood: MoodId, note: string) => {
    const res = await fetch("/api/moods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mood, note }),
    });
    if (!res.ok) return;
    const saved: MoodRow = await res.json();
    setMoods((prev) => {
      const without = prev.filter((m) => m.mood_date !== saved.mood_date);
      return [saved, ...without].sort((a, b) => b.mood_date.localeCompare(a.mood_date));
    });
  };

  return (
    <main className="flex min-h-dvh flex-col px-4 pb-20 pt-5">
      <h1
        className="mb-4 text-lg font-semibold text-[var(--color-brass)]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Mood
      </h1>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <span className="text-sm text-[var(--color-paper)]/40">Loading…</span>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <MoodPicker initial={todayMood?.mood ?? null} onSave={handleSave} />
          {moods.length > 0 && <MoodChart moods={moods} />}
          {moods.some((m) => m.note) && (
            <div className="paper rounded-[var(--radius-page)] p-5 shadow-[var(--shadow-page)]">
              <p className="mb-3 text-sm font-medium text-[var(--color-ink)]" style={{ fontFamily: "var(--font-display)" }}>
                Recent notes
              </p>
              <div className="flex flex-col gap-2">
                {moods.filter((m) => m.note).slice(0, 5).map((m) => {
                  const glyphs: Record<string, string> = { happy:"😊", calm:"🙂", sad:"😔", angry:"😡", tired:"😴", motivated:"🔥" };
                  return (
                    <div key={m.id} className="flex gap-2">
                      <span className="shrink-0 text-base">{glyphs[m.mood] ?? "•"}</span>
                      <div>
                        <p className="text-[10px] text-[var(--color-ink-soft)]/60">
                          {new Date(m.mood_date + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                        </p>
                        <p className="text-sm text-[var(--color-ink-soft)]">{m.note}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
      <BottomNav />
    </main>
  );
}
