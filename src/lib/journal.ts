import { supabaseAdmin } from "@/lib/supabase";

export type Entry = {
  id: string;
  body: string | null;
  entry_date: string;
  updated_at: string;
};

export type Page = {
  id: string;
  page_no: number;
  kind: string;
  entry: Entry | null;
};

export type NotebookPayload = {
  id: string;
  title: string;
  cover: string;
  paper_style: string;
  pages: Page[];
};

// Get user's notebook; create notebook + page 1 + empty entry on first visit.
export async function ensureNotebook(userId: string): Promise<NotebookPayload> {
  let { data: nb } = await supabaseAdmin
    .from("notebooks")
    .select("id, title, cover, paper_style")
    .eq("user_id", userId)
    .eq("is_archived", false)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!nb) {
    const { data: created, error } = await supabaseAdmin
      .from("notebooks")
      .insert({ user_id: userId })
      .select("id, title, cover, paper_style")
      .single();
    if (error) throw error;
    nb = created;
    await createPage(nb.id, userId, 1);
  }

  const { data: pages, error: pErr } = await supabaseAdmin
    .from("pages")
    .select("id, page_no, kind, entries ( id, body, entry_date, updated_at )")
    .eq("notebook_id", nb.id)
    .order("page_no", { ascending: true });
  if (pErr) throw pErr;

  return {
    ...nb,
    pages: (pages ?? []).map((p) => ({
      id: p.id,
      page_no: p.page_no,
      kind: p.kind,
      entry: Array.isArray(p.entries) ? (p.entries[0] ?? null) : (p.entries as Entry | null),
    })),
  };
}

export async function createPage(notebookId: string, userId: string, pageNo: number) {
  const { data: page, error } = await supabaseAdmin
    .from("pages")
    .insert({ notebook_id: notebookId, page_no: pageNo })
    .select("id, page_no, kind")
    .single();
  if (error) throw error;

  const { data: entry, error: eErr } = await supabaseAdmin
    .from("entries")
    .insert({ page_id: page.id, user_id: userId, body: "" })
    .select("id, body, entry_date, updated_at")
    .single();
  if (eErr) throw eErr;

  return { ...page, entry };
}
