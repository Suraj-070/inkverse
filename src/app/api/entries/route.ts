import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase";

// GET /api/entries?limit=50&before=2026-07-01
// Returns entries for memory timeline — newest first
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 50)));
  const before = url.searchParams.get("before"); // ISO date string

  let query = supabaseAdmin
    .from("entries")
    .select(
      "id, body, mood, entry_date, locked_until, created_at, pages ( page_no, notebook_id )"
    )
    .eq("user_id", session.user.id)
    .order("entry_date", { ascending: false })
    .limit(limit);

  if (before) query = query.lt("entry_date", before);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Failed" }, { status: 500 });
  return NextResponse.json(data ?? []);
}
