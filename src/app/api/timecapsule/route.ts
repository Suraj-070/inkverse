import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase";

// POST /api/timecapsule { entryId, locked_until }
// locked_until = ISO datetime string, or null to unlock
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { entryId, locked_until } = await req.json();
  if (!entryId)
    return NextResponse.json({ error: "entryId required" }, { status: 400 });

  // Validate date if provided
  if (locked_until && isNaN(Date.parse(locked_until)))
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });

  // Prevent unlocking a capsule that hasn't opened yet
  if (!locked_until) {
    const { data: entry } = await supabaseAdmin
      .from("entries")
      .select("locked_until")
      .eq("id", entryId)
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (
      entry?.locked_until &&
      new Date(entry.locked_until) > new Date()
    ) {
      return NextResponse.json(
        { error: "Capsule not yet open" },
        { status: 403 }
      );
    }
  }

  const { data, error } = await supabaseAdmin
    .from("entries")
    .update({ locked_until: locked_until ?? null })
    .eq("id", entryId)
    .eq("user_id", session.user.id)
    .select("id, locked_until")
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Failed" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}
