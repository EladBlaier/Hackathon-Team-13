import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { login, getUser } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MathPal — Homework Helper" },
      { name: "description", content: "Snap your math homework, get guided AI tutoring." },
      { property: "og:title", content: "MathPal — Homework Helper" },
      { property: "og:description", content: "Snap your math homework, get guided AI tutoring." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("7");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getUser()) navigate({ to: "/home" });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    await login(name.trim(), grade);
    navigate({ to: "/home" });
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-primary text-primary-foreground text-3xl font-bold mb-4 shadow-lg shadow-primary/20">
            π
          </div>
          <h1 className="text-3xl font-bold tracking-tight">MathPal</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Your friendly math homework buddy
          </p>
        </div>
        <form onSubmit={handleSubmit} className="bg-card rounded-3xl p-6 shadow-sm border space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Your name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="grade">Grade</Label>
            <select
              id="grade"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="6">6th grade</option>
              <option value="7">7th grade</option>
              <option value="8">8th grade</option>
              <option value="9">9th grade</option>
            </select>
          </div>
          <Button type="submit" className="w-full h-11 rounded-xl" disabled={loading}>
            {loading ? "Signing in…" : "Let's go"}
          </Button>
        </form>
        <p className="text-center text-xs text-muted-foreground mt-6">
          Demo login — no password needed
        </p>
      </div>
    </div>
  );
}
