import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ensureNotebook } from "@/lib/journal";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const notebook = await ensureNotebook(session.user.id);
    return NextResponse.json(notebook);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load notebook" }, { status: 500 });
  }
}
