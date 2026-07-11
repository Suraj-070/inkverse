// Ink data model + pen presets.
// Logical page space: 1000 x 1414 (A-series ratio). Strokes stored in these
// units so they stay anchored to the page across devices.

export const PAGE_W = 1000;
export const PAGE_H = 1414;

export type InkPoint = [x: number, y: number, pressure: number, t: number];

export type InkStroke = {
  id: string;
  tool: ToolId;
  color: string;
  points: InkPoint[];
};

export type InkData = {
  version: 1;
  strokes: InkStroke[];
};

export type ToolId = "fountain" | "pencil" | "ballpoint" | "marker" | "highlighter";

export type PenPreset = {
  label: string;
  glyph: string;
  size: number; // in logical units
  thinning: number;
  smoothing: number;
  streamline: number;
  opacity: number;
  blend?: "multiply";
};

export const PENS: Record<ToolId, PenPreset> = {
  fountain: {
    label: "Fountain",
    glyph: "✒️",
    size: 14,
    thinning: 0.7,
    smoothing: 0.6,
    streamline: 0.5,
    opacity: 1,
  },
  pencil: {
    label: "Pencil",
    glyph: "✏️",
    size: 8,
    thinning: 0.45,
    smoothing: 0.4,
    streamline: 0.35,
    opacity: 0.72,
  },
  ballpoint: {
    label: "Ballpoint",
    glyph: "🖊️",
    size: 7,
    thinning: 0.1,
    smoothing: 0.5,
    streamline: 0.45,
    opacity: 1,
  },
  marker: {
    label: "Marker",
    glyph: "🖍️",
    size: 26,
    thinning: 0.05,
    smoothing: 0.55,
    streamline: 0.45,
    opacity: 0.95,
  },
  highlighter: {
    label: "Highlighter",
    glyph: "🖌️",
    size: 55,
    thinning: 0,
    smoothing: 0.6,
    streamline: 0.5,
    opacity: 0.32,
    blend: "multiply",
  },
};

export const INK_COLORS = [
  "#1c1b18", // ink black
  "#16357a", // fountain blue
  "#8c3330", // red
  "#2e5339", // green
  "#a8823c", // brass
];

export const EMPTY_INK: InkData = { version: 1, strokes: [] };

// perfect-freehand outline points -> SVG path (quadratic midpoint smoothing)
export function outlineToPath(points: number[][]): string {
  if (points.length < 2) return "";
  let d = `M ${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)} Q`;
  for (let i = 0; i < points.length; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[(i + 1) % points.length];
    d += ` ${x0.toFixed(1)} ${y0.toFixed(1)} ${((x0 + x1) / 2).toFixed(1)} ${(
      (y0 + y1) / 2
    ).toFixed(1)}`;
  }
  return d + " Z";
}
