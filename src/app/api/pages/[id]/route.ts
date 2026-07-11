import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase";

// DELETE /api/pages/:id
// Next.js 16: params is a Promise — must await.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Ownership via notebook join
  const { data: page } = await supabaseAdmin
    .from("pages")
    .select("id, notebook_id, notebooks!inner ( user_id )")
    .eq("id", id)
    .maybeSingle();

  const nbRel = page?.notebooks as unknown;
  const owner = Array.isArray(nbRel)
    ? (nbRel[0] as { user_id?: string } | undefined)?.user_id
    : (nbRel as { user_id?: string } | null | undefined)?.user_id;

  if (!page || owner !== session.user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { error } = await supabaseAdmin.from("pages").delete().eq("id", id);
  if (error)
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });

  return NextResponse.json({ ok: true });
}
