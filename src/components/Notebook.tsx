"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import InkCanvas from "@/components/InkCanvas";

type Entry = {
  id: string;
  body: string | null;
  entry_date: string;
  updated_at: string;
};
type Page = { id: string; page_no: number; kind: string; entry: Entry | null };
type Notebook = {
  id: string;
  title: string;
  cover: string;
  paper_style: string;
  pages: Page[];
};

type SaveState = "idle" | "saving" | "saved" | "error";

const flipVariants = {
  enter: (dir: number) => ({
    rotateY: dir > 0 ? 70 : -70,
    opacity: 0,
    transformOrigin: dir > 0 ? "left center" : "right center",
  }),
  center: { rotateY: 0, opacity: 1 },
  exit: (dir: number) => ({
    rotateY: dir > 0 ? -70 : 70,
    opacity: 0,
    transformOrigin: dir > 0 ? "left center" : "right center",
  }),
};

export default function Notebook({ userName }: { userName: string }) {
  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawMode, setDrawMode] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestBody = useRef<Map<string, string>>(new Map());
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  // ---------- load ----------
  useEffect(() => {
    fetch("/api/notebook")
      .then((r) => r.json())
      .then((nb: Notebook) => {
        setNotebook(nb);
        setIndex(Math.max(0, nb.pages.length - 1)); // open on last page, like real diary
      })
      .catch(() => setSaveState("error"))
      .finally(() => setLoading(false));
  }, []);

  const pages = notebook?.pages ?? [];
  const page = pages[index];

  // ---------- autosave ----------
  const flushSave = useCallback(async (entryId: string, body: string) => {
    setSaveState("saving");
    try {
      const res = await fetch(`/api/entries/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      setSaveState(res.ok ? "saved" : "error");
    } catch {
      setSaveState("error");
    }
  }, []);

  const onBodyChange = (entryId: string, value: string) => {
    latestBody.current.set(entryId, value);
    setNotebook((nb) =>
      nb
        ? {
            ...nb,
            pages: nb.pages.map((p) =>
              p.entry?.id === entryId
                ? { ...p, entry: { ...p.entry, body: value } }
                : p
            ),
          }
        : nb
    );
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveState("saving");
    saveTimer.current = setTimeout(() => {
      const latest = latestBody.current.get(entryId);
      if (latest !== undefined) flushSave(entryId, latest);
    }, 900);
  };

  // Flush pending save when leaving/hiding (Android PWA kill safety)
  useEffect(() => {
    const flush = () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        latestBody.current.forEach((body, id) => {
          navigator.sendBeacon?.(
            `/api/entries/${id}`,
            new Blob([JSON.stringify({ body })], { type: "application/json" })
          );
        });
      }
    };
    document.addEventListener("visibilitychange", flush);
    return () => document.removeEventListener("visibilitychange", flush);
  }, []);

  // ---------- navigation ----------
  const flipTo = useCallback(
    (next: number) => {
      if (!notebook || next < 0 || next >= notebook.pages.length) return;
      setDirection(next > index ? 1 : -1);
      setIndex(next);
      setMenuOpen(false);
      setDrawMode(false);
    },
    [notebook, index]
  );

  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    // Don't flip while writing or drawing
    if (document.activeElement?.tagName === "TEXTAREA") return;
    if (drawMode) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(dx) > 70 && Math.abs(dy) < 60) {
      flipTo(dx < 0 ? index + 1 : index - 1);
    }
  };

  // ---------- page CRUD ----------
  const addPage = async () => {
    if (!notebook) return;
    setMenuOpen(false);
    const res = await fetch("/api/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notebookId: notebook.id }),
    });
    if (!res.ok) return setSaveState("error");
    const newPage: Page = await res.json();
    setNotebook((nb) =>
      nb ? { ...nb, pages: [...nb.pages, newPage] } : nb
    );
    setDirection(1);
    setIndex(pages.length); // jump to new page
  };

  const deletePage = async () => {
    if (!notebook || !page || pages.length <= 1) return;
    setMenuOpen(false);
    if (!confirm(`Tear out page ${page.page_no}? This cannot be undone.`)) return;
    const removedIndex = index;
    const prevPages = pages;
    // Optimistic
    setNotebook((nb) =>
      nb ? { ...nb, pages: nb.pages.filter((p) => p.id !== page.id) } : nb
    );
    setIndex(Math.max(0, removedIndex - 1));
    const res = await fetch(`/api/pages/${page.id}`, { method: "DELETE" });
    if (!res.ok) {
      // Restore on failure
      setNotebook((nb) => (nb ? { ...nb, pages: prevPages } : nb));
      setIndex(removedIndex);
      setSaveState("error");
    }
  };

  // ---------- render ----------
  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <span className="text-sm text-[var(--color-paper)]/40">
          Opening your notebook…
        </span>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <span className="text-sm text-[var(--color-paper)]/40">
          Couldn&apos;t open the notebook. Pull down to retry.
        </span>
      </div>
    );
  }

  const entryDate = page.entry
    ? new Date(page.entry.entry_date + "T00:00:00")
    : new Date();

  return (
    <div className="flex flex-1 flex-col">
      {/* Top bar */}
      <div className="mb-3 flex items-center justify-between px-1">
        <span className="text-xs text-[var(--color-paper)]/40">
          {saveState === "saving" && "Saving…"}
          {saveState === "saved" && "Saved"}
          {saveState === "error" && (
            <span className="text-[var(--color-ribbon)]">Save failed — check connection</span>
          )}
        </span>
        <div className="relative flex items-center gap-1">
          <button
            onClick={() => setDrawMode((v) => !v)}
            className={`rounded-full px-3 py-1 text-xs ${
              drawMode
                ? "bg-[var(--color-brass)]/25 text-[var(--color-brass)] ring-1 ring-[var(--color-brass)]"
                : "text-[var(--color-paper)]/60"
            }`}
          >
            {drawMode ? "Done" : "✎ Draw"}
          </button>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Page menu"
            className="rounded-full px-3 py-1 text-lg leading-none text-[var(--color-paper)]/60"
          >
            ⋯
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-9 z-20 w-44 overflow-hidden rounded-lg bg-[var(--color-paper)] text-sm text-[var(--color-ink)] shadow-[var(--shadow-cover)]">
              <button
                onClick={addPage}
                className="block w-full px-4 py-3 text-left active:bg-[var(--color-paper-deep)]"
              >
                New page
              </button>
              <button
                onClick={deletePage}
                disabled={pages.length <= 1}
                className="block w-full px-4 py-3 text-left text-[var(--color-ribbon)] active:bg-[var(--color-paper-deep)] disabled:opacity-40"
              >
                Tear out this page
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Book stage */}
      <div
        className="book-stage relative flex-1"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <AnimatePresence mode="popLayout" custom={direction} initial={false}>
          <motion.section
            key={page.id}
            custom={direction}
            variants={flipVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: [0.3, 0.7, 0.4, 1] }}
            className="paper paper-lined absolute inset-0 flex flex-col rounded-[var(--radius-page)] shadow-[var(--shadow-page)]"
          >
            {/* Ribbon on last page — your place in the diary */}
            {index === pages.length - 1 && (
              <div className="absolute -top-1 right-6 h-12 w-3 bg-[var(--color-ribbon)] [clip-path:polygon(0_0,100%_0,100%_100%,50%_80%,0_100%)]" />
            )}

            <InkCanvas
              pageId={page.id}
              drawing={drawMode}
              onSaveState={(st) =>
                setSaveState(st === "saving" ? "saving" : st === "saved" ? "saved" : "error")
              }
            />

            <div className="px-6 pt-5">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink-soft)]/60">
                {entryDate.toLocaleDateString("en-AU", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>

            <div className="flex-1 px-6 pb-2 pt-3">
              <textarea
                className="ink-area"
                placeholder={
                  page.page_no === 1
                    ? `Dear diary… start writing, ${userName}.`
                    : "Write this page…"
                }
                value={page.entry?.body ?? ""}
                readOnly={drawMode}
                onChange={(e) =>
                  page.entry && onBodyChange(page.entry.id, e.target.value)
                }
              />
            </div>

            <div className={`flex items-center justify-between px-6 pb-3 ${drawMode ? "invisible" : ""}`}>
              <button
                onClick={() => flipTo(index - 1)}
                disabled={index === 0}
                className="py-1 pr-4 text-sm text-[var(--color-ink-soft)]/60 disabled:opacity-25"
              >
                ‹ prev
              </button>
              <span className="text-xs text-[var(--color-ink-soft)]/50">
                {page.page_no} / {pages.length}
              </span>
              {index === pages.length - 1 ? (
                <button
                  onClick={addPage}
                  className="py-1 pl-4 text-sm font-medium text-[var(--color-leather)]"
                >
                  new page ›
                </button>
              ) : (
                <button
                  onClick={() => flipTo(index + 1)}
                  className="py-1 pl-4 text-sm text-[var(--color-ink-soft)]/60"
                >
                  next ›
                </button>
              )}
            </div>
          </motion.section>
        </AnimatePresence>
      </div>
    </div>
  );
}
