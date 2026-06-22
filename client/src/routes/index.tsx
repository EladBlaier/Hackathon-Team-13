import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import {
  Button,
  TextField,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Alert,
} from "@mui/material";
import { login, signup, getUser } from "@/lib/api";
import { PageRoot, Container, Brand, LogoMark, FormCard, Hint } from "./index.style";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hintly — Homework Helper" },
      { name: "description", content: "Snap your math homework, get guided AI tutoring." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const user = getUser();
    if (user) {
      navigate({ to: user.role === "teacher" ? "/teacher" : "/home" });
    }
  }, [navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const user =
        mode === "login"
          ? await login(username.trim(), password)
          : await signup(username.trim(), password, role);
      navigate({ to: user.role === "teacher" ? "/teacher" : "/home" });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Something went wrong. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const isSignup = mode === "signup";
  const canSubmit = username.trim().length > 0 && password.trim().length > 0 && !loading;

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

        <FormCard onSubmit={handleSubmit}>
          {error && (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            autoComplete="username"
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isSignup ? "new-password" : "current-password"}
          />

          {isSignup && (
            <ToggleButtonGroup
              value={role}
              exclusive
              onChange={(_, v) => {
                if (v) setRole(v);
              }}
              fullWidth
              size="small"
            >
              <ToggleButton value="student">Student</ToggleButton>
              <ToggleButton value="teacher">Teacher</ToggleButton>
            </ToggleButtonGroup>
          )}

          <Button type="submit" variant="contained" size="large" disabled={!canSubmit}>
            {loading
              ? isSignup
                ? "Creating account…"
                : "Signing in…"
              : isSignup
                ? "Create account"
                : "Sign in"}
          </Button>
        </FormCard>

        <Hint
          onClick={() => {
            setMode(isSignup ? "login" : "signup");
            setError(null);
          }}
          sx={{ cursor: "pointer", textDecoration: "underline", userSelect: "none" }}
        >
          {isSignup ? "Already have an account? Sign in" : "New here? Create an account"}
        </Hint>
      </Container>
    </PageRoot>
  );
}
