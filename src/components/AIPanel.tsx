"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  entryId: string;
  pageId: string;
  hasInk: boolean;          // whether canvas has strokes (show OCR button)
  onTranscript: (t: string) => void; // OCR result callback → Notebook can display
  svgRef: React.RefObject<SVGSVGElement | null>;
};

type Summary = {
  summary: string;
  tags: string[];
  sentiment: "positive" | "neutral" | "negative";
};

const sentimentColor: Record<string, string> = {
  positive: "#2e5339",
  neutral:  "#4a463d",
  negative: "#8c3330",
};

export default function AIPanel({ entryId, pageId, hasInk, onTranscript, svgRef }: Props) {
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [loading, setLoading] = useState<string | null>(null); // "ocr"|"summary"|"reflect"
  const [error, setError] = useState("");

  const call = async (endpoint: string, body: Record<string, string>) => {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
    return res.json();
  };

  const runOCR = async () => {
    if (!svgRef.current) return;
    setLoading("ocr");
    setError("");
    try {
      // Serialise SVG → canvas → PNG base64
      const svg = svgRef.current;
      const svgString = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([svgString], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.src = url;
      await new Promise((res) => { img.onload = res; });

      const canvas = document.createElement("canvas");
      canvas.width = svg.clientWidth * 2;   // 2× for retina
      canvas.height = svg.clientHeight * 2;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#f6f1e7";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);

      const imageBase64 = canvas.toDataURL("image/png");
      const { transcript } = await call("/api/ai/ocr", { pageId, imageBase64 });
      onTranscript(transcript ?? "");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(null);
    }
  };

  const runSummary = async () => {
    setLoading("summary");
    setError("");
    try {
      const result = await call("/api/ai/summarise", { entryId });
      setSummary(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(null);
    }
  };

  const runReflect = async () => {
    setLoading("reflect");
    setError("");
    try {
      const { questions: qs } = await call("/api/ai/reflect", { entryId });
      setQuestions(qs ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="mt-2 px-6 pb-1">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition ${
          open
            ? "bg-[var(--color-ink)] text-[var(--color-brass)]"
            : "border border-[var(--color-ink-soft)]/25 text-[var(--color-ink-soft)]"
        }`}
      >
        <span>✦</span> AI
        <span className="opacity-60">{open ? "▲" : "▼"}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 flex flex-col gap-3">
              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                {hasInk && (
                  <button
                    onClick={runOCR}
                    disabled={!!loading}
                    className="rounded-full border border-[var(--color-ink-soft)]/25 px-3 py-1.5 text-xs text-[var(--color-ink-soft)] disabled:opacity-50 active:bg-[var(--color-paper-deep)]"
                  >
                    {loading === "ocr" ? "Reading ink…" : "📖 Read handwriting"}
                  </button>
                )}
                <button
                  onClick={runSummary}
                  disabled={!!loading}
                  className="rounded-full border border-[var(--color-ink-soft)]/25 px-3 py-1.5 text-xs text-[var(--color-ink-soft)] disabled:opacity-50 active:bg-[var(--color-paper-deep)]"
                >
                  {loading === "summary" ? "Summarising…" : "✦ Summarise"}
                </button>
                <button
                  onClick={runReflect}
                  disabled={!!loading}
                  className="rounded-full border border-[var(--color-ink-soft)]/25 px-3 py-1.5 text-xs text-[var(--color-ink-soft)] disabled:opacity-50 active:bg-[var(--color-paper-deep)]"
                >
                  {loading === "reflect" ? "Thinking…" : "💭 Reflect"}
                </button>
              </div>

              {error && (
                <p className="text-xs text-[var(--color-ribbon)]">{error}</p>
              )}

              {/* Summary result */}
              {summary && (
                <div className="rounded-xl bg-[var(--color-paper-deep)] p-3">
                  <p
                    className="mb-1 text-[10px] uppercase tracking-widest"
                    style={{ color: sentimentColor[summary.sentiment] }}
                  >
                    {summary.sentiment}
                  </p>
                  <p className="text-sm leading-relaxed text-[var(--color-ink)]">
                    {summary.summary}
                  </p>
                  {summary.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {summary.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-[var(--color-ink)]/8 px-2 py-0.5 text-[10px] text-[var(--color-ink-soft)]"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Reflection questions */}
              {questions.length > 0 && (
                <div className="flex flex-col gap-2">
                  {questions.map((q, i) => (
                    <div
                      key={i}
                      className="rounded-xl bg-[var(--color-paper-deep)] p-3"
                    >
                      <p className="text-sm leading-relaxed text-[var(--color-ink)]">
                        {q}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
