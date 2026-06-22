import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, BookOpen, Clock, History } from "lucide-react";
import { listHomeworks, getUser, type Homework } from "@/lib/api";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/home")({
  head: () => ({ meta: [{ title: "Home — MathPal" }] }),
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  const [homeworks, setHomeworks] = useState<Homework[] | null>(null);
  const user = typeof window !== "undefined" ? getUser() : null;

  useEffect(() => {
    if (typeof window !== "undefined" && !getUser()) {
      navigate({ to: "/" });
      return;
    }
    listHomeworks().then(setHomeworks);
  }, [navigate]);

  const recent = homeworks?.slice(0, 6) ?? [];

  return (
    <div className="min-h-screen pb-28">
      <AppHeader title="MathPal" showLogout />
      <main className="max-w-2xl mx-auto px-4 pt-6">
        <section className="mb-6">
          <p className="text-sm text-muted-foreground">Hi {user?.name ?? "there"} 👋</p>
          <h2 className="text-2xl font-bold tracking-tight">Ready to tackle some math?</h2>
        </section>

        <div className="grid grid-cols-2 gap-3 mb-8">
          <Link
            to="/new"
            className="bg-primary text-primary-foreground rounded-2xl p-4 flex flex-col gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform"
          >
            <Plus className="h-6 w-6" />
            <div>
              <div className="font-semibold">New homework</div>
              <div className="text-xs opacity-80">Snap or upload pictures</div>
            </div>
          </Link>
          <Link
            to="/history"
            className="bg-card border rounded-2xl p-4 flex flex-col gap-2 hover:bg-muted/50 transition-colors"
          >
            <History className="h-6 w-6 text-primary" />
            <div>
              <div className="font-semibold">History</div>
              <div className="text-xs text-muted-foreground">All your past work</div>
            </div>
          </Link>
        </div>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Recent homework</h3>
            {homeworks && homeworks.length > 6 ? (
              <Link to="/history" className="text-sm text-primary">See all</Link>
            ) : null}
          </div>

          {homeworks === null ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {recent.map((hw) => (
                <HomeworkCard key={hw.id} hw={hw} />
              ))}
            </div>
          )}
        </section>
      </main>

      <Link
        to="/new"
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        aria-label="Add homework"
      >
        <Plus className="h-7 w-7" />
      </Link>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-card border border-dashed rounded-2xl p-8 text-center">
      <BookOpen className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
      <p className="font-medium">No homework yet</p>
      <p className="text-sm text-muted-foreground mb-4">
        Tap the + to add your first one
      </p>
      <Button asChild>
        <Link to="/new">
          <Plus className="h-4 w-4 mr-1" /> Add homework
        </Link>
      </Button>
    </div>
  );
}

export function HomeworkCard({ hw }: { hw: Homework }) {
  return (
    <Link
      to="/review/$id"
      params={{ id: hw.id }}
      className="group relative aspect-square rounded-2xl overflow-hidden bg-card border hover:shadow-md transition-shadow"
    >
      {hw.coverImage ? (
        <img
          src={hw.coverImage}
          alt={hw.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/30" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-3 text-white">
        <div className="flex items-center gap-1 text-[10px] opacity-90 mb-1">
          <StatusDot status={hw.status} />
          <span className="capitalize">{hw.status}</span>
          <span className="opacity-60">·</span>
          <Clock className="h-3 w-3" />
          <span>{formatRelative(hw.updatedAt)}</span>
        </div>
        <div className="font-semibold text-sm leading-tight line-clamp-2">{hw.title}</div>
      </div>
    </Link>
  );
}

function StatusDot({ status }: { status: Homework["status"] }) {
  const color =
    status === "completed"
      ? "bg-emerald-400"
      : status === "reviewing"
      ? "bg-amber-400 animate-pulse"
      : "bg-slate-300";
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${color}`} />;
}

function formatRelative(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}