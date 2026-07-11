"use client";

import { MOODS, MoodId } from "@/components/MoodPicker";

type MoodRow = { mood: MoodId; mood_date: string };

const moodMap = Object.fromEntries(MOODS.map((m) => [m.id, m]));

function getLast30Days(): string[] {
  const days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export default function MoodChart({ moods }: { moods: MoodRow[] }) {
  const byDate = Object.fromEntries(moods.map((m) => [m.mood_date, m.mood]));
  const days = getLast30Days();

  // Count moods for the mini-stats
  const counts: Record<string, number> = {};
  moods.forEach((m) => {
    counts[m.mood] = (counts[m.mood] ?? 0) + 1;
  });
  const topMood = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="paper rounded-[var(--radius-page)] p-5 shadow-[var(--shadow-page)]">
      <div className="mb-3 flex items-baseline justify-between">
        <p
          className="text-sm font-medium text-[var(--color-ink)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Last 30 days
        </p>
        {topMood && (
          <p className="text-xs text-[var(--color-ink-soft)]">
            Most: {moodMap[topMood[0]]?.glyph} {moodMap[topMood[0]]?.label} ×{topMood[1]}
          </p>
        )}
      </div>

      {/* Calendar grid — 6 cols × 5 rows */}
      <div className="grid grid-cols-10 gap-1">
        {days.map((date) => {
          const mood = byDate[date] as MoodId | undefined;
          const m = mood ? moodMap[mood] : null;
          const isToday = date === new Date().toISOString().slice(0, 10);
          return (
            <div
              key={date}
              title={`${date}${m ? ` — ${m.label}` : ""}`}
              className={`aspect-square rounded-sm ${
                isToday ? "ring-1 ring-[var(--color-brass)]" : ""
              }`}
              style={{
                backgroundColor: m ? m.color + "55" : "rgb(28 27 24 / 0.08)",
              }}
            >
              {m && (
                <span className="flex h-full w-full items-center justify-center text-[10px] leading-none">
                  {m.glyph}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
        {MOODS.map((m) => (
          <span key={m.id} className="flex items-center gap-1 text-[10px] text-[var(--color-ink-soft)]">
            <span>{m.glyph}</span> {m.label}
          </span>
        ))}
      </div>
    </div>
  );
}
