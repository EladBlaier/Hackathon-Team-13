import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ImagePlus, Camera, Send, Sparkles } from "lucide-react";
import {
  appendMessage,
  getHomework,
  getUser,
  type Homework,
  type ChatMessage,
} from "@/lib/api";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { filesToDataUrls } from "@/lib/file-utils";

export const Route = createFileRoute("/review/$id")({
  head: () => ({ meta: [{ title: "Review — MathPal" }] }),
  component: ReviewPage,
});

function ReviewPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [hw, setHw] = useState<Homework | null>(null);
  const [text, setText] = useState("");
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [tutorTyping, setTutorTyping] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && !getUser()) {
      navigate({ to: "/" });
      return;
    }
    let cancelled = false;
    const load = () =>
      getHomework(id).then((h) => {
        if (cancelled) return;
        if (!h) {
          navigate({ to: "/home" });
          return;
        }
        setHw(h);
        setTutorTyping(h.messages.at(-1)?.role === "student");
      });
    load();
    const onUpdate = (e: Event) => {
      if ((e as CustomEvent).detail === id) load();
    };
    window.addEventListener("hw:update", onUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener("hw:update", onUpdate);
    };
  }, [id, navigate]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [hw?.messages.length, tutorTyping]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const urls = await filesToDataUrls(files);
    setPendingImages((p) => [...p, ...urls]);
  }

  async function send() {
    const trimmed = text.trim();
    if (!trimmed && pendingImages.length === 0) return;
    setText("");
    const imgs = pendingImages;
    setPendingImages([]);
    setTutorTyping(true);
    await appendMessage(id, {
      role: "student",
      text: trimmed || undefined,
      images: imgs.length ? imgs : undefined,
    });
    const fresh = await getHomework(id);
    if (fresh) setHw(fresh);
  }

  if (!hw) {
    return (
      <div className="min-h-screen">
        <AppHeader title="Loading…" back="/home" />
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col">
      <AppHeader title={hw.title} back="/home" />

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          <div className="bg-accent/40 border border-accent rounded-2xl p-3 flex gap-2 items-start">
            <Sparkles className="h-4 w-4 text-accent-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-accent-foreground">
              MathPal is reviewing your work. Ask questions, share more photos, or walk through your steps.
            </p>
          </div>

          {hw.messages.map((m) => (
            <MessageBubble key={m.id} msg={m} />
          ))}

          {tutorTyping ? <TypingBubble /> : null}
        </div>
      </div>

      <div className="border-t bg-background">
        <div className="max-w-2xl mx-auto p-3 space-y-2">
          {pendingImages.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {pendingImages.map((src, i) => (
                <div key={i} className="relative h-16 w-16 rounded-lg overflow-hidden shrink-0">
                  <img src={src} className="w-full h-full object-cover" alt="" />
                  <button
                    onClick={() => setPendingImages((p) => p.filter((_, j) => j !== i))}
                    className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-black/70 text-white text-xs"
                    aria-label="Remove"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex items-end gap-2">
            <div className="flex gap-1">
              <button
                onClick={() => cameraRef.current?.click()}
                className="h-10 w-10 rounded-full bg-muted hover:bg-muted/70 flex items-center justify-center text-muted-foreground"
                aria-label="Take photo"
              >
                <Camera className="h-5 w-5" />
              </button>
              <button
                onClick={() => galleryRef.current?.click()}
                className="h-10 w-10 rounded-full bg-muted hover:bg-muted/70 flex items-center justify-center text-muted-foreground"
                aria-label="Attach image"
              >
                <ImagePlus className="h-5 w-5" />
              </button>
            </div>

            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Ask MathPal anything…"
              rows={1}
              className="min-h-10 max-h-32 resize-none rounded-2xl"
            />

            <Button
              size="icon"
              className="h-10 w-10 rounded-full shrink-0"
              onClick={send}
              disabled={!text.trim() && pendingImages.length === 0}
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </Button>
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
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isStudent = msg.role === "student";
  return (
    <div className={`flex ${isStudent ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] space-y-2 ${isStudent ? "items-end" : "items-start"} flex flex-col`}>
        {msg.images && msg.images.length > 0 ? (
          <div className={`grid gap-1.5 ${msg.images.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
            {msg.images.map((src, i) => (
              <img
                key={i}
                src={src}
                alt=""
                className="rounded-2xl max-h-56 w-full object-cover border"
              />
            ))}
          </div>
        ) : null}
        {msg.text ? (
          <div
            className={
              isStudent
                ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-2.5 text-sm leading-relaxed"
                : "bg-card border rounded-2xl rounded-bl-md px-4 py-2.5 text-sm leading-relaxed"
            }
          >
            {msg.text}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex justify-start">
      <div className="bg-card border rounded-2xl rounded-bl-md px-4 py-3 flex gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.2s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.1s]" />
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" />
      </div>
    </div>
  );
}