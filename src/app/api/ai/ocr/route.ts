import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { groq } from "@/lib/ai";

// POST /api/ai/ocr { pageId, imageBase64 }
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

  if (base64.length > 4_000_000)
    return NextResponse.json({ error: "Image too large" }, { status: 413 });

  try {
    const response = await groq().chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${base64}`,
              },
            },
            {
              type: "text",
              text: `You are an expert handwriting recognition system.
Transcribe ALL handwritten text visible in this journal page image exactly as written.
Preserve line breaks. If no handwriting is present, return an empty string.
Return ONLY the transcribed text, nothing else — no commentary, no labels.`,
            },
          ],
        },
      ],
      max_tokens: 1000,
      temperature: 0.2,
    });

    const transcript = response.choices[0]?.message?.content?.trim() ?? "";

    // Persist transcript
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