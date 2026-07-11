import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { groq, GROQ_MODEL, parseJSON } from "@/lib/ai";

type SummaryResult = {
  summary: string;
  tags: string[];        // e.g. ["coding", "React", "productive"]
  sentiment: "positive" | "neutral" | "negative";
};

// POST /api/ai/summarise { entryId }
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { entryId } = await req.json();
  if (!entryId)
    return NextResponse.json({ error: "entryId required" }, { status: 400 });

  const { data: entry } = await supabaseAdmin
    .from("entries")
    .select("id, body, transcript, entry_date")
    .eq("id", entryId)
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const content = [entry.transcript, entry.body].filter(Boolean).join("\n\n").trim();
  if (!content)
    return NextResponse.json({ error: "No content to summarise" }, { status: 400 });

  const prompt = `You are a personal journal assistant. Read this journal entry and respond ONLY with a JSON object (no markdown, no preamble):

{
  "summary": "<2 sentences capturing the main thoughts and feelings>",
  "tags": ["<topic1>", "<topic2>", "<topic3>"],
  "sentiment": "<positive|neutral|negative>"
}

Journal entry (${entry.entry_date}):
---
${content.slice(0, 3000)}`;

  try {
    const chat = groq();
    const response = await chat.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
      temperature: 0.4,
    });

    const text = response.choices[0]?.message?.content ?? "";
    const result = parseJSON<SummaryResult>(text);

    if (!result?.summary)
      return NextResponse.json({ error: "AI returned invalid response" }, { status: 500 });

    return NextResponse.json(result);
  } catch (e) {
    console.error("Summarise error:", e);
    return NextResponse.json({ error: "AI failed" }, { status: 500 });
  }
}
