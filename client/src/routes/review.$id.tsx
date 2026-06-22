import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { IconButton } from "@mui/material";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import SendIcon from "@mui/icons-material/Send";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { appendMessage, getHomework, getUser, type Homework, type ChatMessage } from "@/lib/api";
import { AppHeader } from "@/components/AppHeader";
import { filesToDataUrls } from "@/lib/file-utils";
import {
  PageRoot,
  ScrollArea,
  ScrollInner,
  InfoBanner,
  Row,
  BubbleStack,
  ImageGrid,
  BubbleImage,
  Bubble,
  TypingBubbleEl,
  Composer,
  ComposerInner,
  PendingStrip,
  PendingThumb,
  PendingImg,
  PendingRemove,
  ComposerRow,
  IconBtn,
  MessageField,
  HiddenInput,
} from "./review.$id.style";

export const Route = createFileRoute("/review/$id")({
  head: () => ({ meta: [{ title: "Review — Hintly" }] }),
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
    // Optimistically show the student's message while the tutor "thinks".
    setHw((prev) =>
      prev
        ? {
            ...prev,
            messages: [
              ...prev.messages,
              {
                id: `pending-${Date.now()}`,
                role: "student",
                text: trimmed || undefined,
                images: imgs.length ? imgs : undefined,
                createdAt: Date.now(),
              },
            ],
          }
        : prev,
    );
    setTutorTyping(true);
    try {
      await appendMessage(id, {
        role: "student",
        text: trimmed || undefined,
        images: imgs.length ? imgs : undefined,
      });
      const fresh = await getHomework(id);
      if (fresh) setHw(fresh);
    } finally {
      setTutorTyping(false);
    }
  }

  if (!hw) {
    return (
      <PageRoot>
        <AppHeader title="Loading…" back="/home" />
      </PageRoot>
    );
  }

  return (
    <PageRoot>
      <AppHeader title={hw.title} back="/home" />

      <ScrollArea ref={scrollRef}>
        <ScrollInner>
          <InfoBanner>
            <AutoAwesomeIcon sx={{ fontSize: 16, mt: "2px", flexShrink: 0 }} />
            <span>
              Hintly is reviewing your work. Ask questions, share more photos, or walk through your
              steps.
            </span>
          </InfoBanner>

          {hw.messages.map((m) => (
            <MessageBubble key={m.id} msg={m} />
          ))}

          {tutorTyping ? <TypingBubble /> : null}
        </ScrollInner>
      </ScrollArea>

      <Composer>
        <ComposerInner>
          {pendingImages.length > 0 ? (
            <PendingStrip>
              {pendingImages.map((src, i) => (
                <PendingThumb key={i}>
                  <PendingImg src={src} alt="" />
                  <PendingRemove
                    aria-label="Remove"
                    onClick={() => setPendingImages((p) => p.filter((_, j) => j !== i))}
                  >
                    ×
                  </PendingRemove>
                </PendingThumb>
              ))}
            </PendingStrip>
          ) : null}

          <ComposerRow>
            <IconBtn aria-label="Take photo" onClick={() => cameraRef.current?.click()}>
              <CameraAltIcon />
            </IconBtn>
            <IconBtn aria-label="Attach image" onClick={() => galleryRef.current?.click()}>
              <AddPhotoAlternateIcon />
            </IconBtn>

            <MessageField
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Ask Hintly anything…"
              multiline
              maxRows={5}
            />

            <IconButton
              color="primary"
              aria-label="Send"
              onClick={send}
              disabled={!text.trim() && pendingImages.length === 0}
              sx={{
                width: 40,
                height: 40,
                bgcolor: "primary.main",
                color: "primary.contrastText",
                "&:hover": { bgcolor: "primary.dark" },
                "&.Mui-disabled": { bgcolor: "action.disabledBackground" },
              }}
            >
              <SendIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </ComposerRow>

          <HiddenInput
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={(e) => handleFiles(e.target.files)}
          />
          <HiddenInput
            ref={galleryRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleFiles(e.target.files)}
          />
        </ComposerInner>
      </Composer>
    </PageRoot>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isStudent = msg.role === "student";
  return (
    <Row isStudent={isStudent}>
      <BubbleStack isStudent={isStudent}>
        {msg.images && msg.images.length > 0 ? (
          <ImageGrid multi={msg.images.length > 1}>
            {msg.images.map((src, i) => (
              <BubbleImage key={i} src={src} alt="" />
            ))}
          </ImageGrid>
        ) : null}
        {msg.text ? <Bubble isStudent={isStudent}>{msg.text}</Bubble> : null}
      </BubbleStack>
    </Row>
  );
}

function TypingBubble() {
  return (
    <Row isStudent={false}>
      <TypingBubbleEl>
        <span />
        <span />
        <span />
      </TypingBubbleEl>
    </Row>
  );
}
