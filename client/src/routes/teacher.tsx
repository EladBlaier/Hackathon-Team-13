import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import {
  Button,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  TextField,
  Typography,
  Avatar,
  CircularProgress,
  IconButton,
  Tooltip,
  Alert,
  Divider,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import PersonIcon from "@mui/icons-material/Person";
import DeleteIcon from "@mui/icons-material/Delete";
import SendIcon from "@mui/icons-material/Send";
import {
  getUser,
  getTeacherStudents,
  addStudentToTeacher,
  removeStudentFromTeacher,
  generateQuestion,
  assignQuestion,
  assignBulk,
  type StudentEntry,
} from "@/lib/api";
import { AppHeader } from "@/components/AppHeader";
import { PageRoot, Main, StudentCard, EmptyBox } from "./teacher.style";

export const Route = createFileRoute("/teacher")({
  head: () => ({ meta: [{ title: "My Students — Hintly" }] }),
  component: TeacherPage,
});

function TeacherPage() {
  const navigate = useNavigate();
  const user = typeof window !== "undefined" ? getUser() : null;
  const [students, setStudents] = useState<StudentEntry[] | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  // Single-assign state
  const [assignTarget, setAssignTarget] = useState<StudentEntry | null>(null);
  const [assignPrompt, setAssignPrompt] = useState("");
  const [assignName, setAssignName] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedProblem, setGeneratedProblem] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [assignDone, setAssignDone] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  // Mass assign state
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkPrompt, setBulkPrompt] = useState("");
  const [bulkName, setBulkName] = useState("");
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkProblem, setBulkProblem] = useState<string | null>(null);
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const [bulkDone, setBulkDone] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const u = getUser();
    if (!u) {
      navigate({ to: "/" });
      return;
    }
    if (u.role !== "teacher") {
      navigate({ to: "/home" });
      return;
    }
    getTeacherStudents(u.id).then(setStudents);
  }, [navigate]);

  async function handleAddStudent() {
    if (!usernameInput.trim() || !user) return;
    setAdding(true);
    setAddError(null);
    try {
      const updated = await addStudentToTeacher(user.id, usernameInput.trim());
      setStudents(updated);
      setDialogOpen(false);
      setUsernameInput("");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Failed to add student.";
      setAddError(msg);
    } finally {
      setAdding(false);
    }
  }

  async function handleRemoveStudent(studentId: string) {
    if (!user) return;
    setRemovingId(studentId);
    try {
      const updated = await removeStudentFromTeacher(user.id, studentId);
      setStudents(updated);
    } finally {
      setRemovingId(null);
    }
  }

  function openDialog() {
    setDialogOpen(true);
    setAddError(null);
    setUsernameInput("");
  }

  function openAssignDialog(student: StudentEntry) {
    setAssignTarget(student);
    setAssignPrompt("");
    setAssignName("");
    setGeneratedProblem(null);
    setAssignDone(false);
    setAssignError(null);
  }

  function closeAssignDialog() {
    if (generating || assigning) return;
    setAssignTarget(null);
    setGeneratedProblem(null);
    setAssignDone(false);
  }

  async function handleGenerate() {
    if (!assignPrompt.trim() || !user) return;
    setGenerating(true);
    setAssignError(null);
    try {
      const problem = await generateQuestion(user.id, assignPrompt.trim());
      setGeneratedProblem(problem);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Failed to generate question.";
      setAssignError(msg);
    } finally {
      setGenerating(false);
    }
  }

  async function handleAssign() {
    if (!generatedProblem || !user || !assignTarget) return;
    setAssigning(true);
    setAssignError(null);
    try {
      await assignQuestion(user.id, assignTarget.user_id, generatedProblem, assignName.trim() || undefined);
      setAssignDone(true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Failed to assign question.";
      setAssignError(msg);
    } finally {
      setAssigning(false);
    }
  }

  function openBulkDialog() {
    setBulkOpen(true);
    setBulkPrompt("");
    setBulkName("");
    setBulkSelected(new Set((students ?? []).map((s) => s.user_id)));
    setBulkProblem(null);
    setBulkDone(false);
    setBulkError(null);
  }

  function toggleBulkStudent(id: string) {
    setBulkSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    const all = students ?? [];
    setBulkSelected(
      bulkSelected.size === all.length ? new Set() : new Set(all.map((s) => s.user_id))
    );
  }

  async function handleBulkGenerate() {
    if (!bulkPrompt.trim() || !user) return;
    setBulkGenerating(true);
    setBulkError(null);
    try {
      const problem = await generateQuestion(user.id, bulkPrompt.trim());
      setBulkProblem(problem);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Failed to generate question.";
      setBulkError(msg);
    } finally {
      setBulkGenerating(false);
    }
  }

  async function handleBulkSend() {
    if (!bulkProblem || !user || bulkSelected.size === 0) return;
    setBulkAssigning(true);
    setBulkError(null);
    try {
      await assignBulk(user.id, [...bulkSelected], bulkProblem, bulkName.trim() || undefined);
      setBulkDone(true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Failed to send question.";
      setBulkError(msg);
    } finally {
      setBulkAssigning(false);
    }
  }

  return (
    <PageRoot>
      <AppHeader title="My Students" showLogout />
      <Main>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="h6" fontWeight={700}>
            Students ({students?.length ?? "…"})
          </Typography>
          <div style={{ display: "flex", gap: 8 }}>
            {(students?.length ?? 0) > 0 && (
              <Button variant="outlined" startIcon={<SendIcon />} onClick={openBulkDialog}>
                Send to all
              </Button>
            )}
            <Button variant="contained" startIcon={<AddIcon />} onClick={openDialog}>
              Add student
            </Button>
          </div>
        </div>

        {students === null ? (
          <EmptyBox>
            <CircularProgress />
          </EmptyBox>
        ) : students.length === 0 ? (
          <EmptyBox>
            <PersonIcon sx={{ fontSize: 48, mb: 1 }} />
            <Typography>No students yet.</Typography>
            <Typography variant="body2">
              Use "Add student" to link a student by their username.
            </Typography>
          </EmptyBox>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {students.map((s) => (
              <StudentCard
                key={s.user_id}
                onClick={() => navigate({ to: "/students/$id", params: { id: s.user_id } })}
              >
                <Avatar sx={{ width: 36, height: 36, bgcolor: "primary.main" }}>
                  <PersonIcon fontSize="small" />
                </Avatar>
                <Typography variant="body2" fontWeight={500} sx={{ flex: 1 }}>
                  {s.username}
                </Typography>
                <Tooltip title="Assign a question">
                  <IconButton size="small" color="primary" onClick={() => openAssignDialog(s)}>
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Remove student">
                  <span>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleRemoveStudent(s.user_id)}
                      disabled={removingId === s.user_id}
                    >
                      {removingId === s.user_id ? (
                        <CircularProgress size={16} color="error" />
                      ) : (
                        <DeleteIcon fontSize="small" />
                      )}
                    </IconButton>
                  </span>
                </Tooltip>
              </StudentCard>
            ))}
          </div>
        )}
      </Main>

      {/* Assign question dialog */}
      <Dialog open={!!assignTarget} onClose={closeAssignDialog} fullWidth maxWidth="sm">
        <DialogTitle>
          Assign a question to <strong>{assignTarget?.username}</strong>
        </DialogTitle>
        <DialogContent sx={{ pt: "8px !important", display: "flex", flexDirection: "column", gap: 2 }}>
          {assignDone ? (
            <Alert severity="success" sx={{ borderRadius: 2 }}>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                Question assigned successfully!
              </Typography>
              <Typography
                variant="body2" component="div"
                sx={{ direction: "rtl", textAlign: "right", "& p": { margin: 0 }, "& .katex": { unicodeBidi: "isolate" } }}
              >
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {generatedProblem ?? ""}
                </ReactMarkdown>
              </Typography>
            </Alert>
          ) : (
            <>
              <TextField
                label="Assignment name (optional)"
                placeholder="e.g. Homework 3, Fractions quiz"
                value={assignName}
                onChange={(e) => setAssignName(e.target.value)}
                fullWidth
                autoFocus
                helperText='Card title the student sees — defaults to "שאלה ממורה"'
                disabled={generating || assigning}
              />
              <TextField
                label="Question topic or prompt"
                placeholder='e.g. "easy fractions", "word problem with percentages"'
                value={assignPrompt}
                onChange={(e) => { setAssignPrompt(e.target.value); setAssignError(null); setGeneratedProblem(null); }}
                fullWidth
                multiline
                rows={2}
                helperText={!generatedProblem ? (assignError ?? "Describe the topic — AI generates the question in Hebrew") : undefined}
                error={!!assignError && !generatedProblem}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !generatedProblem) { e.preventDefault(); handleGenerate(); } }}
                disabled={generating || assigning}
              />
              {generatedProblem && (
                <Alert
                  severity="info"
                  sx={{ borderRadius: 2, cursor: "default" }}
                  action={
                    <Button size="small" onClick={() => { setGeneratedProblem(null); setAssignError(null); }}>
                      Regenerate
                    </Button>
                  }
                >
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>Generated question:</Typography>
                  <Typography
                    variant="body2" component="div"
                    sx={{ direction: "rtl", textAlign: "right", "& p": { margin: 0 }, "& .katex": { unicodeBidi: "isolate" } }}
                  >
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {generatedProblem}
                    </ReactMarkdown>
                  </Typography>
                </Alert>
              )}
              {generating && <Alert severity="info" sx={{ borderRadius: 2 }}>Generating question…</Alert>}
              {assignError && generatedProblem && <Alert severity="error" sx={{ borderRadius: 2 }}>{assignError}</Alert>}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeAssignDialog}>{assignDone ? "Close" : "Cancel"}</Button>
          {!assignDone && !generatedProblem && (
            <Button
              variant="outlined"
              onClick={handleGenerate}
              disabled={!assignPrompt.trim() || generating}
              startIcon={generating ? <CircularProgress size={14} color="inherit" /> : undefined}
            >
              {generating ? "Generating…" : "Generate question"}
            </Button>
          )}
          {!assignDone && generatedProblem && (
            <Button
              variant="contained"
              onClick={handleAssign}
              disabled={assigning}
              startIcon={assigning ? <CircularProgress size={14} color="inherit" /> : <SendIcon />}
            >
              {assigning ? "Sending…" : `Assign to ${assignTarget?.username}`}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Bulk assign dialog */}
      <Dialog
        open={bulkOpen}
        onClose={() => { if (!bulkGenerating && !bulkAssigning) setBulkOpen(false); }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Send a question to students</DialogTitle>
        <DialogContent sx={{ pt: "8px !important", display: "flex", flexDirection: "column", gap: 2 }}>
          {bulkDone ? (
            <Alert severity="success" sx={{ borderRadius: 2 }}>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                Question sent to {bulkSelected.size} student{bulkSelected.size !== 1 ? "s" : ""}!
              </Typography>
              <Typography
                variant="body2" component="div"
                sx={{ direction: "rtl", textAlign: "right", "& p": { margin: 0 }, "& .katex": { unicodeBidi: "isolate" } }}
              >
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {bulkProblem ?? ""}
                </ReactMarkdown>
              </Typography>
            </Alert>
          ) : (
            <>
              <TextField
                label="Assignment name (optional)"
                placeholder="e.g. Homework 3, Fractions quiz"
                value={bulkName}
                onChange={(e) => setBulkName(e.target.value)}
                fullWidth
                autoFocus
                helperText='Card title each student sees — defaults to "שאלה ממורה"'
                disabled={bulkGenerating || bulkAssigning}
              />
              <TextField
                label="Question topic or prompt"
                placeholder='e.g. "easy fractions", "word problem with percentages"'
                value={bulkPrompt}
                onChange={(e) => { setBulkPrompt(e.target.value); setBulkError(null); setBulkProblem(null); }}
                fullWidth
                multiline
                rows={2}
                helperText={!bulkProblem ? (bulkError ?? "One question will be generated and sent to all selected students") : undefined}
                error={!!bulkError && !bulkProblem}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !bulkProblem) { e.preventDefault(); handleBulkGenerate(); } }}
                disabled={bulkGenerating || bulkAssigning}
              />
              {bulkProblem && (
                <Alert
                  severity="info"
                  sx={{ borderRadius: 2 }}
                  action={
                    <Button size="small" onClick={() => { setBulkProblem(null); setBulkError(null); }}>
                      Regenerate
                    </Button>
                  }
                >
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>Generated question:</Typography>
                  <Typography
                    variant="body2" component="div"
                    sx={{ direction: "rtl", textAlign: "right", "& p": { margin: 0 }, "& .katex": { unicodeBidi: "isolate" } }}
                  >
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {bulkProblem}
                    </ReactMarkdown>
                  </Typography>
                </Alert>
              )}
              {bulkGenerating && <Alert severity="info" sx={{ borderRadius: 2 }}>Generating question…</Alert>}
              {bulkError && bulkProblem && <Alert severity="error" sx={{ borderRadius: 2 }}>{bulkError}</Alert>}
              <Divider />
              <div>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={(students?.length ?? 0) > 0 && bulkSelected.size === (students?.length ?? 0)}
                      indeterminate={bulkSelected.size > 0 && bulkSelected.size < (students?.length ?? 0)}
                      onChange={toggleAll}
                      disabled={bulkGenerating || bulkAssigning}
                    />
                  }
                  label={<Typography variant="body2" fontWeight={600}>Select all</Typography>}
                />
                <div style={{ display: "flex", flexDirection: "column", paddingLeft: 16 }}>
                  {(students ?? []).map((s) => (
                    <FormControlLabel
                      key={s.user_id}
                      control={
                        <Checkbox
                          checked={bulkSelected.has(s.user_id)}
                          onChange={() => toggleBulkStudent(s.user_id)}
                          disabled={bulkGenerating || bulkAssigning}
                          size="small"
                        />
                      }
                      label={<Typography variant="body2">{s.username}</Typography>}
                    />
                  ))}
                </div>
              </div>
              {bulkAssigning && <Alert severity="info" sx={{ borderRadius: 2 }}>Sending to {bulkSelected.size} student{bulkSelected.size !== 1 ? "s" : ""}…</Alert>}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setBulkOpen(false)}>{bulkDone ? "Close" : "Cancel"}</Button>
          {!bulkDone && !bulkProblem && (
            <Button
              variant="outlined"
              onClick={handleBulkGenerate}
              disabled={!bulkPrompt.trim() || bulkSelected.size === 0 || bulkGenerating}
              startIcon={bulkGenerating ? <CircularProgress size={14} color="inherit" /> : undefined}
            >
              {bulkGenerating ? "Generating…" : "Generate question"}
            </Button>
          )}
          {!bulkDone && bulkProblem && (
            <Button
              variant="contained"
              onClick={handleBulkSend}
              disabled={bulkSelected.size === 0 || bulkAssigning}
              startIcon={bulkAssigning ? <CircularProgress size={14} color="inherit" /> : <SendIcon />}
            >
              {bulkAssigning ? "Sending…" : `Send to ${bulkSelected.size} student${bulkSelected.size !== 1 ? "s" : ""}`}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Add student dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Add a student</DialogTitle>
        <DialogContent sx={{ pt: "8px !important" }}>
          <TextField
            label="Username"
            value={usernameInput}
            onChange={(e) => {
              setUsernameInput(e.target.value);
              setAddError(null);
            }}
            fullWidth
            autoFocus
            helperText={addError ?? "Enter the student's username"}
            error={!!addError}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddStudent();
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddStudent}
            disabled={!usernameInput.trim() || adding}
          >
            {adding ? "Adding…" : "Add"}
          </Button>
        </DialogActions>
      </Dialog>
    </PageRoot>
  );
}
