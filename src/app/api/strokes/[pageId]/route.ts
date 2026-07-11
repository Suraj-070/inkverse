import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase";

// Next.js 16: params is a Promise — must await.
type Ctx = { params: Promise<{ pageId: string }> };

async function ownsPage(pageId: string, userId: string) {
  const { data } = await supabaseAdmin
    .from("pages")
    .select("id, notebooks!inner ( user_id )")
    .eq("id", pageId)
    .maybeSingle();
  const rel = data?.notebooks as unknown;
  const owner = Array.isArray(rel)
    ? (rel[0] as { user_id?: string } | undefined)?.user_id
    : (rel as { user_id?: string } | null | undefined)?.user_id;
  return !!data && owner === userId;
}

// GET /api/strokes/:pageId
export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { pageId } = await params;
  if (!(await ownsPage(pageId, session.user.id)))
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data } = await supabaseAdmin
    .from("strokes")
    .select("data, duration_ms")
    .eq("page_id", pageId)
    .maybeSingle();

  return NextResponse.json(
    data ?? { data: { version: 1, strokes: [] }, duration_ms: 0 }
  );
}

// PUT /api/strokes/:pageId { data, duration_ms }
export async function PUT(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { pageId } = await params;
  if (!(await ownsPage(pageId, session.user.id)))
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  if (!body?.data?.strokes || !Array.isArray(body.data.strokes))
    return NextResponse.json({ error: "Invalid stroke data" }, { status: 400 });

  // Guard: jsonb column, keep payloads sane (~2MB cap)
  if (JSON.stringify(body.data).length > 2_000_000)
    return NextResponse.json({ error: "Page too heavy" }, { status: 413 });

  const { error } = await supabaseAdmin.from("strokes").upsert(
    {
      page_id: pageId,
      user_id: session.user.id,
      data: body.data,
      duration_ms: Math.max(0, Math.round(body.duration_ms ?? 0)),
    },
    { onConflict: "page_id" }
  );

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to save ink" }, { status: 500 });
  }

  // Mark page as containing ink
  await supabaseAdmin
    .from("pages")
    .update({ kind: "mixed" })
    .eq("id", pageId)
    .eq("kind", "text");

  return NextResponse.json({ ok: true });
}
