import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { groq, GROQ_MODEL, parseJSON } from "@/lib/ai";

type WeeklyInsight = {
  headline: string;          // e.g. "A week of building and growth"
  patterns: string[];        // 2-3 recurring themes
  mood_summary: string;      // one sentence on emotional arc
  growth_moment: string;     // most notable growth observation
  prompt_for_next_week: string; // one thing to carry forward
};

// GET /api/ai/weekly
export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fetch last 7 days of entries
  const since = new Date();
  since.setDate(since.getDate() - 7);

  const { data: entries } = await supabaseAdmin
    .from("entries")
    .select("body, transcript, mood, entry_date")
    .eq("user_id", session.user.id)
    .gte("entry_date", since.toISOString().slice(0, 10))
    .order("entry_date", { ascending: true });

  if (!entries || entries.length === 0)
    return NextResponse.json({ error: "Not enough entries for weekly insight" }, { status: 400 });

  // Build condensed journal text
  const journal = entries
    .map((e) => {
      const text = [e.transcript, e.body].filter(Boolean).join(" ").trim();
      return `[${e.entry_date}${e.mood ? `, mood: ${e.mood}` : ""}]\n${text.slice(0, 600)}`;
    })
    .join("\n\n---\n\n");

  const prompt = `You are a personal growth companion reviewing someone's private journal entries from the past week.
Respond ONLY with a JSON object (no markdown, no preamble):

{
  "headline": "<short evocative title for this week, 5-8 words>",
  "patterns": ["<theme 1>", "<theme 2>", "<theme 3>"],
  "mood_summary": "<one sentence describing the emotional arc of the week>",
  "growth_moment": "<the single most meaningful growth or insight you noticed>",
  "prompt_for_next_week": "<one gentle intention or question to carry into next week>"
}

Journal entries:
---
${journal}`;

  try {
    const response = await groq().chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 400,
      temperature: 0.6,
    });

    const text = response.choices[0]?.message?.content ?? "";
    const result = parseJSON<WeeklyInsight>(text);

    if (!result?.headline)
      return NextResponse.json({ error: "AI returned invalid response" }, { status: 500 });

    return NextResponse.json(result);
  } catch (e) {
    console.error("Weekly error:", e);
    return NextResponse.json({ error: "AI failed" }, { status: 500 });
  }
}
