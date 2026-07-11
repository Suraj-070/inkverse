import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";

export default async function Landing() {
  const session = await auth();
  if (session?.user) redirect("/journal");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-10 px-6">
      {/* Closed notebook — signature element. Signing in = opening your diary. */}
      <div className="relative">
        <div
          className="relative h-72 w-52 rounded-[var(--radius-cover)] shadow-[var(--shadow-cover)]"
          style={{
            background:
              "linear-gradient(145deg, var(--color-leather) 0%, var(--color-leather-deep) 100%)",
          }}
        >
          {/* Spine highlight */}
          <div className="absolute inset-y-0 left-0 w-3 rounded-l-[var(--radius-cover)] bg-black/25" />
          {/* Page block peeking out */}
          <div className="absolute inset-y-2 -right-1 w-1.5 rounded-r-sm bg-[var(--color-paper-deep)]" />
          {/* Brass clasp */}
          <div className="absolute right-3 top-1/2 h-10 w-4 -translate-y-1/2 rounded-sm bg-[var(--color-brass)] opacity-90" />
          {/* Embossed title */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
            <span
              className="text-2xl font-semibold tracking-wide text-[var(--color-brass)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              InkVerse
            </span>
            <span className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-paper)]/50">
              memory archive
            </span>
          </div>
          {/* Ribbon */}
          <div className="absolute -bottom-5 left-10 h-8 w-3 bg-[var(--color-ribbon)] [clip-path:polygon(0_0,100%_0,100%_100%,50%_78%,0_100%)]" />
        </div>
      </div>

      <div className="text-center">
        <h1
          className="text-xl font-medium text-[var(--color-paper)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Every page keeps a moment.
        </h1>
        <p className="mt-1 text-sm text-[var(--color-paper)]/50">
          Sign in to open your notebook.
        </p>
      </div>

      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/journal" });
        }}
      >
        <button
          type="submit"
          className="rounded-full bg-[var(--color-paper)] px-8 py-3 font-[var(--font-ui)] text-sm font-medium text-[var(--color-ink)] shadow-[var(--shadow-page)] transition-transform active:scale-95"
        >
          Continue with Google
        </button>
      </form>
    </main>
  );
}
