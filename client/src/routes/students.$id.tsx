import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import PersonIcon from "@mui/icons-material/Person";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import { getUser } from "@/lib/api";
import { AppHeader } from "@/components/AppHeader";
import {
  PageRoot,
  Main,
  HeaderCard,
  AvatarCircle,
  HeaderInfo,
  HeaderId,
  HeaderSub,
  SummaryCard,
  SummaryLabel,
  SummaryText,
  SectionTitle,
  TldrList,
  TldrRow,
  TldrIcon,
  TldrText,
  EmptyTldr,
} from "./students.$id.style";

export const Route = createFileRoute("/students/$id")({
  head: () => ({ meta: [{ title: "Student progress — Hintly" }] }),
  component: StudentStatusPage,
});

// TODO(backend): replace with the real per-student status payload once the
// AI team's endpoint exists, e.g. GET /students/{id}/status. Expected shape
// is mirrored below so swapping the mock for a real fetch shouldn't require
// touching the rest of this component.
type StudentStatus = {
  id: string;
  name?: string;
  summary: string;
  improving: string[];
  strugglingWith: string[];
};

function getMockStatus(id: string): StudentStatus {
  return {
    id,
    summary:
      "Over the last few sessions, this student has been engaging consistently with multi-step algebra problems and is starting to show more confidence working independently before asking for hints. Fraction operations remain a recurring sticking point, especially when mixed with negative numbers.",
    improving: [
      "Solving multi-step linear equations",
      "Showing work step-by-step",
      "Asking targeted questions instead of asking for the answer",
    ],
    strugglingWith: [
      "Operations with negative fractions",
      "Word problems involving rates",
      "Checking final answers for reasonableness",
    ],
  };
}

function StudentStatusPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<StudentStatus | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && !getUser()) {
      navigate({ to: "/" });
      return;
    }
    // TODO(backend): swap for a real fetch, e.g.
    // getStudentStatus(id).then(setStatus);
    setStatus(getMockStatus(id));
  }, [id, navigate]);

  if (!status) {
    return (
      <PageRoot>
        <AppHeader title="Loading…" back="/teacherHome" />
      </PageRoot>
    );
  }

  return (
    <PageRoot>
      <AppHeader title="Student progress" back="/teacherHome" />
      <Main>
        <HeaderCard>
          <AvatarCircle>
            <PersonIcon sx={{ fontSize: 28 }} />
          </AvatarCircle>
          <HeaderInfo>
            <HeaderId>{status.name ?? status.id}</HeaderId>
            <HeaderSub>{status.name ? `ID: ${status.id}` : "Student"}</HeaderSub>
          </HeaderInfo>
        </HeaderCard>

        <SummaryCard>
          <SummaryLabel>
            <AutoAwesomeIcon sx={{ fontSize: 16 }} />
            <span>AI summary</span>
          </SummaryLabel>
          <SummaryText>{status.summary}</SummaryText>
        </SummaryCard>

        <section>
          <SectionTitle>
            <TrendingUpIcon sx={{ fontSize: 20, color: "#16a34a" }} />
            <span>Improving</span>
          </SectionTitle>
          {status.improving.length === 0 ? (
            <EmptyTldr>Nothing flagged yet</EmptyTldr>
          ) : (
            <TldrList>
              {status.improving.map((point, i) => (
                <TldrRow key={i} tone="positive">
                  <TldrIcon tone="positive">
                    <TrendingUpIcon sx={{ fontSize: 16 }} />
                  </TldrIcon>
                  <TldrText tone="positive">{point}</TldrText>
                </TldrRow>
              ))}
            </TldrList>
          )}
        </section>

        <section>
          <SectionTitle>
            <TrendingDownIcon sx={{ fontSize: 20, color: "#dc2626" }} />
            <span>Struggling with</span>
          </SectionTitle>
          {status.strugglingWith.length === 0 ? (
            <EmptyTldr>Nothing flagged yet</EmptyTldr>
          ) : (
            <TldrList>
              {status.strugglingWith.map((point, i) => (
                <TldrRow key={i} tone="negative">
                  <TldrIcon tone="negative">
                    <TrendingDownIcon sx={{ fontSize: 16 }} />
                  </TldrIcon>
                  <TldrText tone="negative">{point}</TldrText>
                </TldrRow>
              ))}
            </TldrList>
          )}
        </section>
      </Main>
    </PageRoot>
  );
}
