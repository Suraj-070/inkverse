import BottomNav from "@/components/BottomNav";

export default function MoodPage() {
  return (
    <main className="flex min-h-dvh flex-col px-4 pb-20 pt-5">
      <h1
        className="mb-4 text-lg font-semibold text-[var(--color-brass)]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Mood
      </h1>
      <section className="paper flex flex-1 flex-col items-center justify-center rounded-[var(--radius-page)] p-8 text-center shadow-[var(--shadow-page)]">
        <p
          className="text-xl text-[var(--color-ink)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          No moods recorded yet.
        </p>
        <p className="mt-2 text-sm text-[var(--color-ink-soft)]">
          Mood tracking arrives in Phase 4.
        </p>
      </section>
      <BottomNav />
    </main>
  );
}
