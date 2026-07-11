"use client";

import { useState } from "react";

export type MoodId = "happy" | "calm" | "sad" | "angry" | "tired" | "motivated";

export const MOODS: { id: MoodId; glyph: string; label: string; color: string }[] = [
  { id: "happy",     glyph: "😊", label: "Happy",     color: "#f59e0b" },
  { id: "calm",      glyph: "🙂", label: "Calm",      color: "#60a5fa" },
  { id: "sad",       glyph: "😔", label: "Sad",       color: "#818cf8" },
  { id: "angry",     glyph: "😡", label: "Angry",     color: "#f87171" },
  { id: "tired",     glyph: "😴", label: "Tired",     color: "#94a3b8" },
  { id: "motivated", glyph: "🔥", label: "Motivated", color: "#fb923c" },
];

type Props = {
  initial?: MoodId | null;
  onSave: (mood: MoodId, note: string) => Promise<void>;
};

export default function MoodPicker({ initial, onSave }: Props) {
  const [selected, setSelected] = useState<MoodId | null>(initial ?? null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    await onSave(selected, note);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="paper rounded-[var(--radius-page)] p-5 shadow-[var(--shadow-page)]">
      <p
        className="mb-4 text-sm font-medium text-[var(--color-ink-soft)]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        How are you feeling today?
      </p>

      {/* Mood grid */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        {MOODS.map((m) => (
          <button
            key={m.id}
            onClick={() => setSelected(m.id)}
            className={`flex flex-col items-center gap-1 rounded-xl py-3 transition-all ${
              selected === m.id
                ? "ring-2 shadow-md"
                : "opacity-60"
            }`}
            style={
              selected === m.id
                ? {
                    backgroundColor: m.color + "22",
                    boxShadow: `0 0 0 2px ${m.color}`,
                  }
                : {}
            }
          >
            <span className="text-2xl">{m.glyph}</span>
            <span className="text-[10px] text-[var(--color-ink-soft)]">
              {m.label}
            </span>
          </button>
        ))}
      </div>

      {/* Optional note */}
      {selected && (
        <textarea
          className="ink-area mb-3 h-16 rounded-lg border border-[var(--color-ink-soft)]/20 px-3 py-2 text-sm"
          placeholder="Add a note… (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      )}

      <button
        onClick={handleSave}
        disabled={!selected || saving}
        className="w-full rounded-full bg-[var(--color-ink)] py-2.5 text-sm font-medium text-[var(--color-paper)] disabled:opacity-40 active:scale-95 transition-transform"
      >
        {saving ? "Saving…" : saved ? "Saved ✓" : "Save mood"}
      </button>
    </div>
  );
}
