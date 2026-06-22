import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listHomeworks, getUser, type Homework } from "@/lib/api";
import { AppHeader } from "@/components/AppHeader";
import { HomeworkCard } from "./home";
import { PageRoot, Main, Grid2, SkeletonTile, EmptyText } from "./history.style";

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
    <PageRoot>
      <AppHeader title="Homework history" back="/home" />
      <Main>
        {homeworks === null ? (
          <Grid2>
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonTile key={i} />
            ))}
          </Grid2>
        ) : homeworks.length === 0 ? (
          <EmptyText>No homework yet.</EmptyText>
        ) : (
          <Grid2>
            {homeworks.map((hw) => (
              <HomeworkCard key={hw.id} hw={hw} />
            ))}
          </Grid2>
        )}
      </Main>
    </PageRoot>
  );
}