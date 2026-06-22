import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Button, TextField, Typography, Autocomplete, Chip } from "@mui/material";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import CloseIcon from "@mui/icons-material/Close";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { AppHeader } from "@/components/AppHeader";
import { filesToDataUrls } from "@/lib/file-utils";
import { createHomework, getUser } from "@/lib/api";
import {
  PageRoot,
  Main,
  FieldGroup,
  PhotoGrid,
  Thumb,
  ThumbImage,
  RemoveBtn,
  PickerTile,
  HiddenInput,
  SubmitBar,
  SubmitInner,
} from "./new.style";

export const Route = createFileRoute("/new")({
  head: () => ({ meta: [{ title: "New homework — Hintly" }] }),
  component: NewHomeworkPage,
});

const SUGGESTED_TAGS = [
  "Math",
  "Algebra",
  "Geometry",
  "Pre-Algebra",
  "Statistics",
  "Calculus",
  "Trigonometry",
];

function NewHomeworkPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState<string[]>([]);
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
      tags,
      images,
    });
    navigate({ to: "/review/$id", params: { id: hw.id } });
  }

  return (
    <PageRoot>
      <AppHeader title="New homework" back="/home" />
      <Main>
        <FieldGroup>
          <TextField
            label="Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Chapter 4 — Fractions"
          />
          <Autocomplete
            multiple
            freeSolo
            options={SUGGESTED_TAGS}
            value={tags}
            onChange={(_, newValue) => setTags(newValue)}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  variant="outlined"
                  size="small"
                  label={option}
                  {...getTagProps({ index })}
                  key={option}
                />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="Tags"
                placeholder={tags.length === 0 ? "e.g. Math, Fractions" : ""}
              />
            )}
          />
        </FieldGroup>

        <div>
          <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
            Photos of your homework
          </Typography>
          <PhotoGrid>
            {images.map((src, i) => (
              <Thumb key={i}>
                <ThumbImage src={src} alt={`Page ${i + 1}`} />
                <RemoveBtn aria-label="Remove" onClick={() => removeImage(i)}>
                  <CloseIcon sx={{ fontSize: 14 }} />
                </RemoveBtn>
              </Thumb>
            ))}

            <PickerTile type="button" primary onClick={() => cameraRef.current?.click()}>
              <CameraAltIcon />
              <span>Camera</span>
            </PickerTile>
            <PickerTile type="button" onClick={() => galleryRef.current?.click()}>
              <AddPhotoAlternateIcon />
              <span>Gallery</span>
            </PickerTile>
          </PhotoGrid>

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

          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
            Add as many pages as you need. You can attach more once the review starts.
          </Typography>
        </div>
      </Main>

      <SubmitBar>
        <SubmitInner>
          <Button
            fullWidth
            size="large"
            variant="contained"
            startIcon={<AutoAwesomeIcon />}
            disabled={images.length === 0 || submitting}
            onClick={handleSubmit}
          >
            {submitting
              ? "Starting review…"
              : images.length === 0
                ? "Add at least 1 photo"
                : `Start AI review (${images.length} photo${images.length > 1 ? "s" : ""})`}
          </Button>
        </SubmitInner>
      </SubmitBar>
    </PageRoot>
  );
}
