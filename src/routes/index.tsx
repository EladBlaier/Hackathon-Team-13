import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import {
  Button,
  TextField,
  MenuItem,
  Typography,
} from "@mui/material";
import { login, getUser } from "@/lib/api";
import {
  PageRoot,
  Container,
  Brand,
  LogoMark,
  FormCard,
  Hint,
} from "./index.style";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MathPal — Homework Helper" },
      { name: "description", content: "Snap your math homework, get guided AI tutoring." },
      { property: "og:title", content: "MathPal — Homework Helper" },
      { property: "og:description", content: "Snap your math homework, get guided AI tutoring." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("7");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getUser()) navigate({ to: "/home" });
  }, [navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    await login(name.trim(), grade);
    navigate({ to: "/home" });
  }

  return (
    <PageRoot>
      <Container>
        <Brand>
          <LogoMark>π</LogoMark>
          <Typography variant="h4" component="h1">
            MathPal
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Your friendly math homework buddy
          </Typography>
        </Brand>
        <FormCard onSubmit={handleSubmit}>
          <TextField
            label="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Alex"
            autoFocus
          />
          <TextField
            select
            label="Grade"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
          >
            <MenuItem value="6">6th grade</MenuItem>
            <MenuItem value="7">7th grade</MenuItem>
            <MenuItem value="8">8th grade</MenuItem>
            <MenuItem value="9">9th grade</MenuItem>
          </TextField>
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={loading || !name.trim()}
          >
            {loading ? "Signing in…" : "Let's go"}
          </Button>
        </FormCard>
        <Hint>Demo login — no password needed</Hint>
      </Container>
    </PageRoot>
  );
}
