import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Avatar,
  CircularProgress,
  IconButton,
  Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import PersonIcon from "@mui/icons-material/Person";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  getUser,
  getTeacherStudents,
  addStudentToTeacher,
  removeStudentFromTeacher,
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const u = getUser();
    if (!u) { navigate({ to: "/" }); return; }
    if (u.role !== "teacher") { navigate({ to: "/home" }); return; }
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

  return (
    <PageRoot>
      <AppHeader title="My Students" showLogout />
      <Main>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="h6" fontWeight={700}>
            Students ({students?.length ?? "…"})
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openDialog}>
            Add student
          </Button>
        </div>

        {students === null ? (
          <EmptyBox><CircularProgress /></EmptyBox>
        ) : students.length === 0 ? (
          <EmptyBox>
            <PersonIcon sx={{ fontSize: 48, mb: 1 }} />
            <Typography>No students yet.</Typography>
            <Typography variant="body2">Use "Add student" to link a student by their username.</Typography>
          </EmptyBox>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {students.map((s) => (
              <StudentCard key={s.user_id}>
                <Avatar sx={{ width: 36, height: 36, bgcolor: "primary.main" }}>
                  <PersonIcon fontSize="small" />
                </Avatar>
                <Typography variant="body2" fontWeight={500} sx={{ flex: 1 }}>
                  {s.username}
                </Typography>
                <Tooltip title="Remove student">
                  <span>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleRemoveStudent(s.user_id)}
                      disabled={removingId === s.user_id}
                    >
                      {removingId === s.user_id
                        ? <CircularProgress size={16} color="error" />
                        : <DeleteIcon fontSize="small" />}
                    </IconButton>
                  </span>
                </Tooltip>
              </StudentCard>
            ))}
          </div>
        )}
      </Main>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Add a student</DialogTitle>
        <DialogContent sx={{ pt: "8px !important" }}>
          <TextField
            label="Username"
            value={usernameInput}
            onChange={(e) => { setUsernameInput(e.target.value); setAddError(null); }}
            fullWidth
            autoFocus
            helperText={addError ?? "Enter the student's username"}
            error={!!addError}
            onKeyDown={(e) => { if (e.key === "Enter") handleAddStudent(); }}
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
