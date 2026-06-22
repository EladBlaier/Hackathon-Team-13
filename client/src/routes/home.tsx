import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import BookIcon from "@mui/icons-material/MenuBook";
import HistoryIcon from "@mui/icons-material/History";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import { listHomeworks, getUser, type Homework } from "@/lib/api";
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
  TileShade,
  TileMeta,
  TileStatusRow,
  TileTitle,
  StatusDotEl,
  Floating,
} from "./home.style";

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
    <PageRoot>
      <AppHeader title="MathPal" showLogout />
      <Main>
        <Greeting>
          <Typography variant="body2" color="text.secondary">
            Hi {user?.name ?? "there"} 👋
          </Typography>
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

      <Floating
        color="primary"
        aria-label="Add homework"
        onClick={() => navigate({ to: "/new" })}
      >
        <AddIcon />
      </Floating>
    </PageRoot>
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
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => navigate({ to: "/new" })}
      >
        Add homework
      </Button>
    </EmptyCard>
  );
}

export function HomeworkCard({ hw }: { hw: Homework }) {
  return (
    <HomeworkTile to="/review/$id" params={{ id: hw.id } as never}>
      {hw.coverImage ? (
        <TileImage src={hw.coverImage} alt={hw.title} />
      ) : (
        <TileGradient />
      )}
      <TileShade />
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