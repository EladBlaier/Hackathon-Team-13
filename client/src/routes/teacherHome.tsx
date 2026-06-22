import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button, IconButton, Typography } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import PersonIcon from "@mui/icons-material/Person";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import BarChartIcon from "@mui/icons-material/BarChart";
import { getUser } from "@/lib/api";
import { AppHeader } from "@/components/AppHeader";
import {
  PageRoot,
  Main,
  Greeting,
  SearchBar,
  SearchInput,
  SectionHead,
  StudentList,
  StudentRow,
  StudentAvatar,
  StudentInfo,
  StudentIdText,
  StudentSub,
  EmptyCard,
  ClassReviewBar,
  ClassReviewInner,
  ClassReviewLabel,
  ClassReviewTitle,
  ClassReviewSub,
} from "./teacherHome.style";

export const Route = createFileRoute("/teacherHome")({
  head: () => ({ meta: [{ title: "Teacher dashboard — Hintly" }] }),
  component: TeacherHomePage,
});

// Students are just bare IDs for now. Once the backend exposes a real
// endpoint (e.g. GET /teachers/{id}/students), replace MOCK_STUDENTS with
// a fetched list — the rest of this component doesn't need to change.
type Student = { id: string };

const MOCK_STUDENTS: Student[] = [
  { id: "325014330" },
  { id: "118203991" },
  { id: "204887123" },
  { id: "411009872" },
  { id: "309981244" },
  { id: "287654213" },
  { id: "190044567" },
  { id: "356712098" },
];

function TeacherHomePage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined" && !getUser()) {
      navigate({ to: "/" });
    }
  }, [navigate]);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return MOCK_STUDENTS;
    return MOCK_STUDENTS.filter((s) => s.id.includes(q));
  }, [query]);

  function handleStudentClick(id: string) {
    // TODO: once a per-student progress route exists, navigate there, e.g.
    // navigate({ to: "/teacher/students/$id", params: { id } });
    console.log("Student tapped:", id);
  }

  function handleClassReview() {
    // TODO: once the whole-class review route exists, navigate there, e.g.
    // navigate({ to: "/class-review" });
    console.log("Class review tapped");
  }

  return (
    <PageRoot>
      <AppHeader title="Hintly" showLogout />
      <Main>
        <Greeting>
          <Typography variant="h5" component="h2" sx={{ fontWeight: 700 }}>
            Your students
          </Typography>
        </Greeting>

        <SearchBar>
          <SearchIcon sx={{ color: "text.secondary", fontSize: 20 }} />
          <SearchInput
            placeholder="Search by student ID…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            inputProps={{ "aria-label": "Search students" }}
          />
          {query ? (
            <IconButton size="small" aria-label="Clear search" onClick={() => setQuery("")}>
              <ClearIcon sx={{ fontSize: 18 }} />
            </IconButton>
          ) : null}
        </SearchBar>

        <section>
          <SectionHead>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Students
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {filtered.length} of {MOCK_STUDENTS.length}
            </Typography>
          </SectionHead>

          {filtered.length === 0 ? (
            <EmptyCard>
              <PersonIcon sx={{ fontSize: 40, color: "text.secondary", mb: 1 }} />
              <Typography sx={{ fontWeight: 500 }}>No students found</Typography>
              <Typography variant="body2" color="text.secondary">
                Try a different ID
              </Typography>
            </EmptyCard>
          ) : (
            <StudentList>
              {filtered.map((s) => (
                <StudentRow key={s.id} onClick={() => handleStudentClick(s.id)}>
                  <StudentAvatar>
                    <PersonIcon sx={{ fontSize: 20 }} />
                  </StudentAvatar>
                  <StudentInfo>
                    <StudentIdText>{s.id}</StudentIdText>
                    <StudentSub>Tap to view progress</StudentSub>
                  </StudentInfo>
                  <ChevronRightIcon sx={{ color: "text.secondary", fontSize: 20 }} />
                </StudentRow>
              ))}
            </StudentList>
          )}
        </section>
      </Main>

      <ClassReviewBar>
        <ClassReviewInner>
          <BarChartIcon color="primary" />
          <ClassReviewLabel>
            <ClassReviewTitle>Class review</ClassReviewTitle>
            <ClassReviewSub>Whole-class progress & analytics</ClassReviewSub>
          </ClassReviewLabel>
          <Button variant="contained" size="small" onClick={handleClassReview}>
            View
          </Button>
        </ClassReviewInner>
      </ClassReviewBar>
    </PageRoot>
  );
}
