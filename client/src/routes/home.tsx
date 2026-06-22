import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import BookIcon from "@mui/icons-material/MenuBook";
import HistoryIcon from "@mui/icons-material/History";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import LightbulbIcon from "@mui/icons-material/EmojiObjects";
import SchoolIcon from "@mui/icons-material/School";
import {
  getNextStep,
  startPractice,
  listConcepts,
  listHomeworks,
  getUser,
  type Homework,
  type NextStep,
  type ConceptOption,
} from "@/lib/api";
import { AppHeader } from "@/components/AppHeader";
import {
  PageRoot,
  Main,
  Greeting,
  QuickGrid,
  QuickPrimary,
  QuickSecondary,
  QuickTitle,
  QuickSub,
  SectionHead,
  Grid2,
  SkeletonTile,
  EmptyCard,
  HomeworkTile,
  TileImage,
  TileGradient,
  TileAssignedBg,
  TileShade,
  TileMeta,
  TileStatusRow,
  TileTitle,
  StatusDotEl,
  Floating,
} from "./home.style";

export const Route = createFileRoute("/home")({
  head: () => ({ meta: [{ title: "Home — Hintly" }] }),
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  const [homeworks, setHomeworks] = useState<Homework[] | null>(null);
  const user = typeof window !== "undefined" ? getUser() : null;
  console.log(user);

  useEffect(() => {
    if (typeof window !== "undefined" && !getUser()) {
      navigate({ to: "/" });
      return;
    }
    listHomeworks().then(setHomeworks);
  }, [navigate]);

  const assigned = homeworks?.filter((hw) => hw.assignedBy) ?? [];
  const recent = homeworks?.filter((hw) => !hw.assignedBy).slice(0, 6) ?? [];

  return (
    <PageRoot>
      <AppHeader title="Hintly" showLogout />
      <Main>
        <Greeting>
          <Typography variant="h5" component="h2" sx={{ fontWeight: 700 }}>
            Ready to tackle some math?
          </Typography>
        </Greeting>

        <QuickGrid>
          <QuickPrimary to="/new">
            <AddIcon />
            <div>
              <QuickTitle>New homework</QuickTitle>
              <QuickSub>Snap or upload pictures</QuickSub>
            </div>
          </QuickPrimary>
          <QuickSecondary to="/history">
            <HistoryIcon color="primary" />
            <div>
              <QuickTitle>History</QuickTitle>
              <QuickSub style={{ opacity: 0.7 }}>All your past work</QuickSub>
            </div>
          </QuickSecondary>
        </QuickGrid>

        <PracticeNext />

        {assigned.length > 0 && (
          <section>
            <SectionHead>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Assigned to you
              </Typography>
            </SectionHead>
            <Grid2>
              {assigned.map((hw) => (
                <HomeworkCard key={hw.id} hw={hw} />
              ))}
            </Grid2>
          </section>
        )}

        <section>
          <SectionHead>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Recent homework
            </Typography>
            {homeworks && homeworks.length > 6 ? (
              <Button component={RouterLinkBtn} to="/history" size="small">
                See all
              </Button>
            ) : null}
          </SectionHead>

          {homeworks === null ? (
            <Grid2>
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonTile key={i} />
              ))}
            </Grid2>
          ) : recent.length === 0 ? (
            <EmptyState />
          ) : (
            <Grid2>
              {recent.map((hw) => (
                <HomeworkCard key={hw.id} hw={hw} />
              ))}
            </Grid2>
          )}
        </section>
      </Main>
    </PageRoot>
  );
}

// Proactive practice launcher. Suggests a subject from the student's mastery
// profile but lets them pick any subject, then opens a fresh conversation seeded
// with a grade-aligned generated problem.
function PracticeNext() {
  const navigate = useNavigate();
  const [next, setNext] = useState<NextStep | null>(null);
  const [concepts, setConcepts] = useState<ConceptOption[]>([]);
  const [picked, setPicked] = useState<string>("");
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    // Load the subject catalog and the suggestion together; default the picker
    // to the suggestion (else the first grade-appropriate subject).
    Promise.all([listConcepts(), getNextStep().catch(() => null)]).then(([opts, rec]) => {
      setConcepts(opts);
      setNext(rec);
      setPicked(rec?.concept ?? opts[0]?.concept ?? "");
    });
  }, []);

  if (concepts.length === 0) return null;

  const difficultyLabel =
    next?.difficulty === "harder"
      ? "Level up"
      : next?.difficulty === "easier"
        ? "Build the basics"
        : "Keep going";

  async function start() {
    if (!picked) return;
    setStarting(true);
    try {
      // Backend generates a problem and opens a new conversation; jump into it.
      const session = await startPractice(picked);
      navigate({ to: "/review/$id", params: { id: session.conversation_id } });
    } catch {
      setStarting(false); // stay on the page if it failed
    }
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        mb: 1,
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        background: "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(16,185,129,0.08))",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <LightbulbIcon color="primary" fontSize="small" />
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Practice next
        </Typography>
        {next ? (
          <Chip
            size="small"
            label={difficultyLabel}
            color="primary"
            variant="outlined"
            sx={{ ml: "auto" }}
          />
        ) : null}
      </Box>

      <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
        <TextField
          select
          size="small"
          label="Subject"
          value={picked}
          onChange={(e) => setPicked(e.target.value)}
          sx={{ minWidth: 200, "& .MuiInputBase-input": { direction: "rtl", textAlign: "right" } }}
        >
          {concepts.map((c) => (
            <MenuItem
              key={c.concept}
              value={c.concept}
              sx={{ direction: "rtl", justifyContent: "flex-end" }}
            >
              {c.he_name}
              {next?.concept === c.concept ? " ⭐" : ""}
            </MenuItem>
          ))}
        </TextField>
        <Button
          variant="contained"
          onClick={start}
          disabled={starting || !picked}
          startIcon={starting ? <CircularProgress size={14} color="inherit" /> : undefined}
        >
          {starting ? "Starting…" : "Start practice"}
        </Button>
      </Box>
    </Paper>
  );
}

function EmptyState() {
  const navigate = useNavigate();
  return (
    <EmptyCard>
      <BookIcon sx={{ fontSize: 40, color: "text.secondary", mb: 1 }} />
      <Typography sx={{ fontWeight: 500 }}>No homework yet</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Tap the + to add your first one
      </Typography>
      <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate({ to: "/new" })}>
        Add homework
      </Button>
    </EmptyCard>
  );
}

export function HomeworkCard({ hw }: { hw: Homework }) {
  return (
    <HomeworkTile to="/review/$id" params={{ id: hw.id } as never}>
      {hw.coverImage
        ? <TileImage src={hw.coverImage} alt={hw.title} />
        : hw.assignedBy
          ? <TileAssignedBg><SchoolIcon sx={{ fontSize: 56, color: "rgba(255,255,255,0.35)" }} /></TileAssignedBg>
          : <TileGradient />}
      <TileShade />
      {hw.assignedBy && (
        <Chip
          label="Assigned"
          size="small"
          sx={{
            position: "absolute",
            top: 8,
            left: 8,
            bgcolor: "primary.main",
            color: "primary.contrastText",
            fontWeight: 700,
            fontSize: "0.65rem",
            height: 20,
          }}
        />
      )}
      <TileMeta>
        <TileStatusRow>
          <StatusDotEl status={hw.status} />
          <span>{hw.status}</span>
          <span style={{ opacity: 0.6 }}>·</span>
          <AccessTimeIcon sx={{ fontSize: 12 }} />
          <span>{formatRelative(hw.updatedAt)}</span>
        </TileStatusRow>
        <TileTitle>{hw.title}</TileTitle>
      </TileMeta>
    </HomeworkTile>
  );
}

// Forwarder for MUI Button component prop
import { Link as RouterLinkBtn } from "@tanstack/react-router";

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
