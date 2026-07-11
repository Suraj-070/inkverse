"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const PRESETS = [
  { label: "1 month",  days: 30  },
  { label: "3 months", days: 90  },
  { label: "6 months", days: 180 },
  { label: "1 year",   days: 365 },
];

type Props = {
  entryId: string;
  onClose: () => void;
  onLocked: (until: string) => void;
};

export default function TimeCapsuleModal({ entryId, onClose, onLocked }: Props) {
  const [custom, setCustom] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const lock = async (isoDate: string) => {
    setSaving(true);
    setError("");
    const res = await fetch("/api/timecapsule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entryId, locked_until: isoDate }),
    });
    setSaving(false);
    if (!res.ok) { setError("Failed to seal capsule."); return; }
    onLocked(isoDate);
    onClose();
  };

  const lockPreset = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    lock(d.toISOString());
  };

  const lockCustom = () => {
    if (!custom) return;
    const d = new Date(custom);
    if (isNaN(d.getTime()) || d <= new Date()) {
      setError("Pick a future date.");
      return;
    }
    lock(d.toISOString());
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-4 pb-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className="paper w-full max-w-sm rounded-2xl p-6 shadow-[var(--shadow-cover)]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-center gap-2">
            <span className="text-2xl">⏳</span>
            <div>
              <p className="font-semibold text-[var(--color-ink)]" style={{ fontFamily: "var(--font-display)" }}>
                Seal as Time Capsule
              </p>
              <p className="text-xs text-[var(--color-ink-soft)]">
                This page will be hidden until the date you choose.
              </p>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.days}
                onClick={() => lockPreset(p.days)}
                disabled={saving}
                className="rounded-xl border border-[var(--color-ink-soft)]/20 py-2.5 text-sm text-[var(--color-ink)] active:bg-[var(--color-paper-deep)] disabled:opacity-40"
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="mb-3 flex gap-2">
            <input
              type="date"
              value={custom}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setCustom(e.target.value)}
              className="flex-1 rounded-xl border border-[var(--color-ink-soft)]/20 bg-transparent px-3 py-2 text-sm text-[var(--color-ink)] outline-none"
            />
            <button
              onClick={lockCustom}
              disabled={saving || !custom}
              className="rounded-xl bg-[var(--color-ink)] px-4 py-2 text-sm text-[var(--color-paper)] disabled:opacity-40"
            >
              Seal
            </button>
          </div>

          {error && <p className="mb-2 text-xs text-[var(--color-ribbon)]">{error}</p>}

          <button
            onClick={onClose}
            className="w-full py-2 text-xs text-[var(--color-ink-soft)]"
          >
            Cancel
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
