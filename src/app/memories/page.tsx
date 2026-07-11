import BottomNav from "@/components/BottomNav";
import MemoriesClient from "@/components/MemoriesClient";

export default function MemoriesPage() {
  return (
    <main className="flex min-h-dvh flex-col px-4 pb-20 pt-5">
      <h1
        className="mb-4 text-lg font-semibold text-[var(--color-brass)]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Memories
      </h1>
      <MemoriesClient />
      <BottomNav />
    </main>
  );
}
