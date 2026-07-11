import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { gemini, GEMINI_MODEL } from "@/lib/ai";

// POST /api/ai/ocr { pageId, imageBase64 }
// imageBase64: data:image/png;base64,... OR raw base64 string
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { pageId, imageBase64 } = await req.json();
  if (!pageId || !imageBase64)
    return NextResponse.json({ error: "pageId and imageBase64 required" }, { status: 400 });

  // Ownership check
  const { data: page } = await supabaseAdmin
    .from("pages")
    .select("id, notebooks!inner ( user_id )")
    .eq("id", pageId)
    .maybeSingle();

  const rel = page?.notebooks as unknown;
  const owner = Array.isArray(rel)
    ? (rel[0] as { user_id?: string } | undefined)?.user_id
    : (rel as { user_id?: string } | null | undefined)?.user_id;

  if (!page || owner !== session.user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Strip data URL prefix if present
  const base64 = imageBase64.includes(",")
    ? imageBase64.split(",")[1]
    : imageBase64;

  // Guard payload size — ~3MB base64 ≈ 2.25MB image
  if (base64.length > 4_000_000)
    return NextResponse.json({ error: "Image too large" }, { status: 413 });

  try {
    const model = gemini().getGenerativeModel({ model: GEMINI_MODEL });
    const result = await model.generateContent([
      {
        inlineData: { mimeType: "image/png", data: base64 },
      },
      `You are an expert handwriting recognition system.
Transcribe ALL handwritten text visible in this journal page image exactly as written.
Preserve line breaks. If no handwriting is present, return an empty string.
Return ONLY the transcribed text, nothing else — no commentary, no labels.`,
    ]);
    const transcript = result.response.text().trim();

    // Persist transcript to entries row for this page
    const { data: entry } = await supabaseAdmin
      .from("entries")
      .select("id")
      .eq("page_id", pageId)
      .maybeSingle();

    if (entry?.id) {
      await supabaseAdmin
        .from("entries")
        .update({ transcript })
        .eq("id", entry.id)
        .eq("user_id", session.user.id);
    }

    return NextResponse.json({ transcript });
  } catch (e) {
    console.error("OCR error:", e);
    return NextResponse.json({ error: "OCR failed" }, { status: 500 });
  }
}
