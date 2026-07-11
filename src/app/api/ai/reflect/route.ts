import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { groq, GROQ_MODEL, parseJSON } from "@/lib/ai";

// POST /api/ai/reflect { entryId }
// Returns 3 personalised reflection questions
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { entryId } = await req.json();
  if (!entryId)
    return NextResponse.json({ error: "entryId required" }, { status: 400 });

  const { data: entry } = await supabaseAdmin
    .from("entries")
    .select("id, body, transcript, mood, entry_date")
    .eq("id", entryId)
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const content = [entry.transcript, entry.body].filter(Boolean).join("\n\n").trim();
  if (!content)
    return NextResponse.json({ error: "Nothing to reflect on" }, { status: 400 });

  const prompt = `You are a thoughtful journaling companion. Based on this journal entry, generate exactly 3 personalised reflection questions to help the writer think deeper.

Rules:
- Questions must be specific to what they wrote, not generic
- Be warm, curious, not clinical
- Vary the depth: 1 factual follow-up, 1 emotional, 1 forward-looking
- Respond ONLY with a JSON array of 3 strings, no markdown

Entry (${entry.entry_date}, mood: ${entry.mood ?? "not recorded"}):
---
${content.slice(0, 2000)}`;

  try {
    const response = await groq().chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 250,
      temperature: 0.7,
    });

    const text = response.choices[0]?.message?.content ?? "";
    const questions = parseJSON<string[]>(text);

    if (!Array.isArray(questions) || questions.length === 0)
      return NextResponse.json({ error: "AI returned invalid response" }, { status: 500 });

    return NextResponse.json({ questions: questions.slice(0, 3) });
  } catch (e) {
    console.error("Reflect error:", e);
    return NextResponse.json({ error: "AI failed" }, { status: 500 });
  }
}
