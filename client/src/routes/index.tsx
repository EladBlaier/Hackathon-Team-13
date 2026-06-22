import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Button, TextField, Typography, ToggleButton } from "@mui/material";
import { login, getUser } from "@/lib/api";
import {
  PageRoot,
  Container,
  Brand,
  LogoMark,
  FormCard,
  Hint,
  RoleToggleGroup,
} from "./index.style";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hintly — Homework Helper" },
      { name: "description", content: "Snap your math homework, get guided AI tutoring." },
      { property: "og:title", content: "Hintlyy — Homework Helper" },
      { property: "og:description", content: "Snap your math homework, get guided AI tutoring." },
    ],
  }),
  component: LoginPage,
});

type Role = "student" | "teacher";

function LoginPage() {
  const navigate = useNavigate();
  const [id, setId] = useState("");
  const [role, setRole] = useState<Role>("student");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getUser()) navigate({ to: "/home" });
  }, [navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!id.trim()) return;
    setLoading(true);
    await login(id.trim());
    navigate({ to: role === "teacher" ? "/teacher-home" : "/home" });
  }

  return (
    <PageRoot>
      <Container>
        <Brand>
          <LogoMark>π</LogoMark>
          <Typography variant="h4" component="h1">
            Hintly
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Your friendly math homework buddy
          </Typography>
        </Brand>

        <RoleToggleGroup
          value={role}
          exclusive
          fullWidth
          onChange={(_, value) => {
            if (value) setRole(value);
          }}
        >
          <ToggleButton value="student">Student</ToggleButton>
          <ToggleButton value="teacher">Teacher</ToggleButton>
        </RoleToggleGroup>

        <FormCard onSubmit={handleSubmit}>
          <TextField
            label="Your ID"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="e.g. 123456"
            autoFocus
          />
          <Button type="submit" variant="contained" size="large" disabled={loading || !id.trim()}>
            {loading ? "Signing in…" : "Let's go"}
          </Button>
        </FormCard>
        <Hint>Demo login — no password needed</Hint>
      </Container>
    </PageRoot>
  );
}
