import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listHomeworks, getUser, type Homework } from "@/lib/api";
import { AppHeader } from "@/components/AppHeader";
import { HomeworkCard } from "./home";

export const Route = createFileRoute("/history")({
  head: () => ({ meta: [{ title: "History — MathPal" }] }),
  component: HistoryPage,
});

function HistoryPage() {
  const navigate = useNavigate();
  const [homeworks, setHomeworks] = useState<Homework[] | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && !getUser()) {
      navigate({ to: "/" });
      return;
    }
    listHomeworks().then(setHomeworks);
  }, [navigate]);

  return (
    <div className="min-h-screen pb-12">
      <AppHeader title="Homework history" back="/home" />
      <main className="max-w-2xl mx-auto px-4 pt-6">
        {homeworks === null ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : homeworks.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">No homework yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {homeworks.map((hw) => (
              <HomeworkCard key={hw.id} hw={hw} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}