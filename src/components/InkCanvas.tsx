"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getStroke } from "perfect-freehand";
import {
  EMPTY_INK,
  INK_COLORS,
  InkData,
  InkStroke,
  PAGE_H,
  PAGE_W,
  PENS,
  ToolId,
  outlineToPath,
} from "@/lib/ink";

type Props = {
  pageId: string;
  drawing: boolean; // true = capture input; false = display only
  svgRef?: React.RefObject<SVGSVGElement | null>; // exposed for OCR snapshot
  onSaveState?: (s: "saving" | "saved" | "error") => void;
};

const ERASER_RADIUS = 30; // logical units
const INTER_STROKE_GAP = 400; // ms between strokes in replay timeline

// Session cache so flipping pages doesn't refetch every time
const inkCache = new Map<string, { data: InkData; duration: number }>();

function strokePath(s: InkStroke): string {
  const preset = PENS[s.tool];
  const outline = getStroke(
    s.points.map(([x, y, p]) => [x, y, p]),
    {
      size: preset.size,
      thinning: preset.thinning,
      smoothing: preset.smoothing,
      streamline: preset.streamline,
      simulatePressure: s.points.every(([, , p]) => p === 0.5),
    }
  );
  return outlineToPath(outline);
}

export default function InkCanvas({ pageId, drawing, svgRef: externalRef, onSaveState }: Props) {
  const [strokes, setStrokes] = useState<InkStroke[]>([]);
  const [current, setCurrent] = useState<InkStroke | null>(null);
  const [tool, setTool] = useState<ToolId | "eraser">("fountain");
  const [color, setColor] = useState(INK_COLORS[0]);
  const [loaded, setLoaded] = useState(false);
  const [replayT, setReplayT] = useState<number | null>(null); // null = not replaying

  const internalRef = useRef<SVGSVGElement>(null);
  const svgRef = (externalRef ?? internalRef) as React.RefObject<SVGSVGElement>;
  const past = useRef<InkStroke[][]>([]);
  const future = useRef<InkStroke[][]>([]);
  const hasPen = useRef(false);
  const strokeStart = useRef(0);
  const tOffset = useRef(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);
  const strokesRef = useRef<InkStroke[]>([]);
  strokesRef.current = strokes;

  // ---------- load ----------
  useEffect(() => {
    const cached = inkCache.get(pageId);
    if (cached) {
      setStrokes(cached.data.strokes);
      tOffset.current = cached.duration;
      setLoaded(true);
      return;
    }
    fetch(`/api/strokes/${pageId}`)
      .then((r) => r.json())
      .then((res: { data: InkData; duration_ms: number }) => {
        const data = res?.data ?? EMPTY_INK;
        inkCache.set(pageId, { data, duration: res?.duration_ms ?? 0 });
        setStrokes(data.strokes);
        tOffset.current = res?.duration_ms ?? 0;
      })
      .catch(() => onSaveState?.("error"))
      .finally(() => setLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId]);

  // ---------- save ----------
  const persist = useCallback(
    (viaBeacon = false) => {
      if (!dirty.current) return;
      dirty.current = false;
      const payload = {
        data: { version: 1 as const, strokes: strokesRef.current },
        duration_ms: tOffset.current,
      };
      inkCache.set(pageId, {
        data: payload.data,
        duration: payload.duration_ms,
      });
      if (viaBeacon) {
        // keepalive fetch survives unload/page-hide on Android
        fetch(`/api/strokes/${pageId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch(() => {});
        return;
      }
      onSaveState?.("saving");
      fetch(`/api/strokes/${pageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then((r) => onSaveState?.(r.ok ? "saved" : "error"))
        .catch(() => onSaveState?.("error"));
    },
    [pageId, onSaveState]
  );

  const scheduleSave = useCallback(() => {
    dirty.current = true;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persist(), 1200);
  }, [persist]);

  // Flush on unmount (page flip) and on tab hide
  useEffect(() => {
    const onHide = () => persist(true);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      persist(true);
    };
  }, [persist]);

  // ---------- coordinate mapping ----------
  const toLogical = (e: React.PointerEvent): [number, number] => {
    const rect = svgRef.current!.getBoundingClientRect();
    return [
      ((e.clientX - rect.left) / rect.width) * PAGE_W,
      ((e.clientY - rect.top) / rect.height) * PAGE_H,
    ];
  };

  // ---------- drawing ----------
  const pushHistory = () => {
    past.current.push(strokesRef.current);
    if (past.current.length > 50) past.current.shift();
    future.current = [];
  };

  const eraseAt = (x: number, y: number) => {
    const hit = strokesRef.current.find((s) =>
      s.points.some(
        ([px, py]) => (px - x) ** 2 + (py - y) ** 2 < ERASER_RADIUS ** 2
      )
    );
    if (hit) {
      pushHistory();
      setStrokes((prev) => prev.filter((s) => s.id !== hit.id));
      scheduleSave();
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!drawing || replayT !== null) return;
    if (e.pointerType === "pen") hasPen.current = true;
    // Palm rejection: once a pen has been seen, ignore finger input
    if (e.pointerType === "touch" && hasPen.current) return;
    if (!e.isPrimary) {
      setCurrent(null); // second finger = palm/pinch, cancel
      return;
    }
    (e.target as Element).setPointerCapture(e.pointerId);
    const [x, y] = toLogical(e);

    if (tool === "eraser") {
      eraseAt(x, y);
      return;
    }

    strokeStart.current = performance.now();
    setCurrent({
      id: crypto.randomUUID(),
      tool,
      color,
      points: [[x, y, e.pressure || 0.5, tOffset.current + INTER_STROKE_GAP]],
    });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawing || replayT !== null) return;
    if (e.pointerType === "touch" && hasPen.current) return;

    if (tool === "eraser") {
      if (e.buttons > 0) {
        const [x, y] = toLogical(e);
        eraseAt(x, y);
      }
      return;
    }

    if (!current) return;
    const [x, y] = toLogical(e);
    const t =
      tOffset.current +
      INTER_STROKE_GAP +
      (performance.now() - strokeStart.current);
    // getCoalescedEvents for smoother pen input where supported
    const native = e.nativeEvent as PointerEvent;
    const coalesced = native.getCoalescedEvents?.() ?? [];
    const pts: [number, number, number, number][] =
      coalesced.length > 0
        ? coalesced.map((ce) => {
            const rect = svgRef.current!.getBoundingClientRect();
            return [
              ((ce.clientX - rect.left) / rect.width) * PAGE_W,
              ((ce.clientY - rect.top) / rect.height) * PAGE_H,
              ce.pressure || 0.5,
              t,
            ];
          })
        : [[x, y, e.pressure || 0.5, t]];
    setCurrent((c) => (c ? { ...c, points: [...c.points, ...pts] } : c));
  };

  const onPointerUp = () => {
    if (!current) return;
    if (current.points.length > 1) {
      pushHistory();
      const lastT = current.points[current.points.length - 1][3];
      tOffset.current = lastT;
      setStrokes((prev) => [...prev, current]);
      scheduleSave();
    }
    setCurrent(null);
  };

  const undo = () => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push(strokesRef.current);
    setStrokes(prev);
    scheduleSave();
  };

  const redo = () => {
    const next = future.current.pop();
    if (!next) return;
    past.current.push(strokesRef.current);
    setStrokes(next);
    scheduleSave();
  };

  // ---------- replay ----------
  const replay = () => {
    if (strokes.length === 0) return;
    const total = tOffset.current || 1;
    const speed = Math.max(1, total / 8000); // compress long sessions to ~8s
    const start = performance.now();
    setReplayT(0);
    const tick = () => {
      const virtual = (performance.now() - start) * speed;
      if (virtual >= total) {
        setReplayT(null);
        return;
      }
      setReplayT(virtual);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const visibleStrokes = useMemo(() => {
    const all = current ? [...strokes, current] : strokes;
    if (replayT === null) return all;
    return strokes
      .map((s) => ({
        ...s,
        points: s.points.filter(([, , , t]) => t <= replayT),
      }))
      .filter((s) => s.points.length > 1);
  }, [strokes, current, replayT]);

  return (
    <>
      {/* Ink layer */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${PAGE_W} ${PAGE_H}`}
        preserveAspectRatio="none"
        className={`absolute inset-0 z-10 h-full w-full ${
          drawing ? "touch-none" : "pointer-events-none"
        }`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => setCurrent(null)}
        onPointerLeave={onPointerUp}
      >
        {visibleStrokes.map((s) => (
          <path
            key={s.id}
            d={strokePath(s)}
            fill={s.color}
            opacity={PENS[s.tool].opacity}
            style={
              PENS[s.tool].blend
                ? { mixBlendMode: PENS[s.tool].blend }
                : undefined
            }
          />
        ))}
      </svg>

      {/* Toolbar — only in draw mode */}
      {drawing && (
        <div className="absolute inset-x-0 bottom-0 z-20 rounded-b-[var(--radius-page)] bg-[var(--color-ink)]/92 px-3 py-2 backdrop-blur">
          <div className="flex items-center justify-between gap-1">
            {(Object.keys(PENS) as ToolId[]).map((id) => (
              <button
                key={id}
                onClick={() => setTool(id)}
                aria-label={PENS[id].label}
                className={`rounded-lg px-2 py-1.5 text-base transition ${
                  tool === id
                    ? "bg-[var(--color-brass)]/25 ring-1 ring-[var(--color-brass)]"
                    : "opacity-60"
                }`}
              >
                {PENS[id].glyph}
              </button>
            ))}
            <button
              onClick={() => setTool("eraser")}
              aria-label="Eraser"
              className={`rounded-lg px-2 py-1.5 text-base transition ${
                tool === "eraser"
                  ? "bg-[var(--color-brass)]/25 ring-1 ring-[var(--color-brass)]"
                  : "opacity-60"
              }`}
            >
              ◻️
            </button>
            <div className="mx-1 h-6 w-px bg-white/10" />
            <button
              onClick={undo}
              aria-label="Undo"
              className="px-2 py-1.5 text-sm text-[var(--color-paper)]/70"
            >
              ↺
            </button>
            <button
              onClick={redo}
              aria-label="Redo"
              className="px-2 py-1.5 text-sm text-[var(--color-paper)]/70"
            >
              ↻
            </button>
            <button
              onClick={replay}
              disabled={strokes.length === 0 || replayT !== null}
              aria-label="Replay writing"
              className="px-2 py-1.5 text-sm text-[var(--color-paper)]/70 disabled:opacity-30"
            >
              ▶
            </button>
          </div>
          <div className="mt-1.5 flex items-center gap-3 px-1">
            {INK_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                aria-label={`Ink color ${c}`}
                className={`h-6 w-6 rounded-full border ${
                  color === c
                    ? "border-[var(--color-brass)] ring-2 ring-[var(--color-brass)]/40"
                    : "border-white/20"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
            {!loaded && (
              <span className="ml-auto text-[10px] text-[var(--color-paper)]/40">
                loading ink…
              </span>
            )}
          </div>
        </div>
      )}
    </>
  );
}
