import { auth, signOut } from "@/auth";
import Notebook from "@/components/Notebook";
import BottomNav from "@/components/BottomNav";

export default async function JournalPage() {
  const session = await auth();
  const firstName = session?.user?.name?.split(" ")[0] ?? "writer";

  return (
    <main className="flex min-h-dvh flex-col px-4 pb-20 pt-5">
      <header className="mb-3 flex items-center justify-between">
        <h1
          className="text-lg font-semibold text-[var(--color-brass)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          InkVerse
        </h1>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="text-xs text-[var(--color-paper)]/50 underline underline-offset-4"
          >
            Sign out
          </button>
        </form>
      </header>

      <Notebook userName={firstName} />
      <BottomNav />
    </main>
  );
}
