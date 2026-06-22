import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Camera, ImagePlus, X, Sparkles } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { filesToDataUrls } from "@/lib/file-utils";
import { createHomework, getUser } from "@/lib/api";

export const Route = createFileRoute("/new")({
  head: () => ({ meta: [{ title: "New homework — MathPal" }] }),
  component: NewHomeworkPage,
});

function NewHomeworkPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("Math");
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  if (typeof window !== "undefined" && !getUser()) {
    navigate({ to: "/" });
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const urls = await filesToDataUrls(files);
    setImages((prev) => [...prev, ...urls]);
  }

  function removeImage(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit() {
    if (images.length === 0) return;
    setSubmitting(true);
    const hw = await createHomework({
      title: title.trim() || `Homework — ${new Date().toLocaleDateString()}`,
      subject,
      images,
    });
    navigate({ to: "/review/$id", params: { id: hw.id } });
  }

  return (
    <div className="min-h-screen pb-32">
      <AppHeader title="New homework" back="/home" />
      <main className="max-w-2xl mx-auto px-4 pt-6 space-y-6">
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="title">Title (optional)</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Chapter 4 — Fractions"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <select
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option>Math</option>
              <option>Algebra</option>
              <option>Geometry</option>
              <option>Pre-Algebra</option>
              <option>Statistics</option>
            </select>
          </div>
        </div>

        <div>
          <Label className="mb-2 block">Photos of your homework</Label>
          <div className="grid grid-cols-3 gap-2">
            {images.map((src, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-muted">
                <img src={src} alt={`Page ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                  aria-label="Remove"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              className="aspect-square rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 flex flex-col items-center justify-center gap-1 text-primary transition-colors"
            >
              <Camera className="h-6 w-6" />
              <span className="text-xs font-medium">Camera</span>
            </button>
            <button
              type="button"
              onClick={() => galleryRef.current?.click()}
              className="aspect-square rounded-xl border-2 border-dashed border-border hover:bg-muted/40 flex flex-col items-center justify-center gap-1 text-muted-foreground transition-colors"
            >
              <ImagePlus className="h-6 w-6" />
              <span className="text-xs font-medium">Gallery</span>
            </button>
          </div>

          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />

          <p className="text-xs text-muted-foreground mt-3">
            Add as many pages as you need. You can attach more once the review starts.
          </p>
        </div>
      </main>

      <div className="fixed bottom-0 inset-x-0 bg-background/90 backdrop-blur border-t">
        <div className="max-w-2xl mx-auto p-4">
          <Button
            className="w-full h-12 rounded-xl text-base"
            disabled={images.length === 0 || submitting}
            onClick={handleSubmit}
          >
            <Sparkles className="h-5 w-5 mr-2" />
            {submitting
              ? "Starting review…"
              : images.length === 0
              ? "Add at least 1 photo"
              : `Start AI review (${images.length} photo${images.length > 1 ? "s" : ""})`}
          </Button>
        </div>
      </div>
    </div>
  );
}