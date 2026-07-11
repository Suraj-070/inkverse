import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/moods?months=3  — mood rows for last N months
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const months = Math.min(12, Math.max(1, Number(url.searchParams.get("months") ?? 3)));
  const since = new Date();
  since.setMonth(since.getMonth() - months);

  const { data, error } = await supabaseAdmin
    .from("moods")
    .select("id, mood, note, mood_date")
    .eq("user_id", session.user.id)
    .gte("mood_date", since.toISOString().slice(0, 10))
    .order("mood_date", { ascending: false });

  if (error) return NextResponse.json({ error: "Failed" }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/moods { mood, note?, mood_date? }  — upsert today's mood
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const validMoods = ["happy", "calm", "sad", "angry", "tired", "motivated"];
  if (!validMoods.includes(body.mood))
    return NextResponse.json({ error: "Invalid mood" }, { status: 400 });

  const mood_date =
    body.mood_date ?? new Date().toISOString().slice(0, 10);

  const { data, error } = await supabaseAdmin
    .from("moods")
    .upsert(
      {
        user_id: session.user.id,
        mood: body.mood,
        note: body.note ?? null,
        mood_date,
      },
      { onConflict: "user_id,mood_date" }
    )
    .select("id, mood, note, mood_date")
    .single();

  if (error) return NextResponse.json({ error: "Failed" }, { status: 500 });
  return NextResponse.json(data);
}
