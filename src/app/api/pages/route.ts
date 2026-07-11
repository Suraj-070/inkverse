import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { createPage } from "@/lib/journal";

// POST /api/pages { notebookId } — append new page after last
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { notebookId } = await req.json();
  if (!notebookId)
    return NextResponse.json({ error: "notebookId required" }, { status: 400 });

  // Ownership check
  const { data: nb } = await supabaseAdmin
    .from("notebooks")
    .select("id")
    .eq("id", notebookId)
    .eq("user_id", session.user.id)
    .maybeSingle();
  if (!nb) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: last } = await supabaseAdmin
    .from("pages")
    .select("page_no")
    .eq("notebook_id", notebookId)
    .order("page_no", { ascending: false })
    .limit(1)
    .maybeSingle();

  try {
    const page = await createPage(notebookId, session.user.id, (last?.page_no ?? 0) + 1);
    return NextResponse.json(page, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create page" }, { status: 500 });
  }
}
