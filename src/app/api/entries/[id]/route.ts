import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase";

// PATCH (and POST alias for sendBeacon) /api/entries/:id { body }
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  return PATCH(req, ctx);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const payload = await req.json();

  const update: Record<string, unknown> = {};
  if (typeof payload.body === "string") update.body = payload.body;
  const validMoods = ["happy", "calm", "sad", "angry", "tired", "motivated"];
  if (payload.mood && validMoods.includes(payload.mood)) update.mood = payload.mood;
  if (Object.keys(update).length === 0)
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("entries")
    .update(update)
    .eq("id", id)
    .eq("user_id", session.user.id)
    .select("id, updated_at")
    .maybeSingle();

  if (error)
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(data);
}
