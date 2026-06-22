import axios from "axios";
// Real API client. Talks to the FastAPI backend (server/) which now owns the
// AI: posting a turn uploads the student's work and returns Gemini-generated
// tutoring feedback. Conversation state lives in S3 on the backend; only the
// logged-in student id is kept client-side.

export type HomeworkStatus = "pending" | "reviewing" | "completed";

export interface ChatMessage {
  id: string;
  role: "student" | "tutor";
  text?: string;
  images?: string[]; // URLs (presigned from the backend) or data URLs (optimistic)
  createdAt: number;
}

export interface Homework {
  id: string;
  title: string;
  subject: string;
  status: HomeworkStatus;
  coverImage?: string;
  images: string[];
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  assignedBy?: string;
}

export interface User {
  id: string;
  username: string;
  role: "student" | "teacher";
}

const USER_KEY = "mh_user";
const uid = () => Math.random().toString(36).slice(2, 10);

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8000",
});

// ---------- AUTH ----------
export async function login(username: string, password: string): Promise<User> {
  const { data } = await api.post<{ user_id: string; username: string; role: string }>(
    "/auth/login",
    { username, password },
  );
  const user: User = { id: data.user_id, username: data.username, role: data.role as User["role"] };
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

export async function signup(
  username: string,
  password: string,
  role: "student" | "teacher",
): Promise<User> {
  const { data } = await api.post<{ user_id: string; username: string; role: string }>(
    "/auth/register",
    { username, password, role },
  );
  const user: User = { id: data.user_id, username: data.username, role: data.role as User["role"] };
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

export function getUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) ?? "null");
  } catch {
    return null;
  }
}
export function logout() {
  localStorage.removeItem(USER_KEY);
}

function studentId(): string {
  const id = getUser()?.id;
  if (!id) throw new Error("Not logged in");
  return id;
}

// ---------- TEACHER ----------
export interface StudentEntry {
  user_id: string;
  username: string;
}

export async function getTeacherStudents(teacherId: string): Promise<StudentEntry[]> {
  const { data } = await api.get<StudentEntry[]>(`/teachers/${teacherId}/students`);
  return data;
}

export async function addStudentToTeacher(
  teacherId: string,
  username: string,
): Promise<StudentEntry[]> {
  const { data } = await api.post<StudentEntry[]>(`/teachers/${teacherId}/students`, { username });
  return data;
}

export async function removeStudentFromTeacher(
  teacherId: string,
  studentId: string,
): Promise<StudentEntry[]> {
  const { data } = await api.delete<StudentEntry[]>(`/teachers/${teacherId}/students/${studentId}`);
  return data;
}

export async function generateQuestion(
  teacherId: string,
  prompt: string,
): Promise<string> {
  const { data } = await api.post<{ problem: string }>(`/teachers/${teacherId}/generate-question`, { prompt });
  return data.problem;
}

export async function assignQuestion(
  teacherId: string,
  studentId: string,
  problem: string,
  name?: string,
): Promise<{ conversation_id: string; problem: string }> {
  const { data } = await api.post(`/teachers/${teacherId}/students/${studentId}/assign`, {
    problem,
    ...(name ? { name } : {}),
  });
  return data;
}

export interface BulkAssignResult {
  student_id: string;
  conversation_id: string;
}

export async function assignBulk(
  teacherId: string,
  studentIds: string[],
  problem: string,
  name?: string,
): Promise<{ problem: string; results: BulkAssignResult[] }> {
  const { data } = await api.post(`/teachers/${teacherId}/assign-bulk`, {
    problem,
    student_ids: studentIds,
    ...(name ? { name } : {}),
  });
  return data;
}

// ---------- backend payload shapes ----------
interface ConversationSummary {
  id: string;
  name: string;
  cover_image_url?: string | null;
  assigned_by?: string | null;
}
interface AiFeedback {
  reply?: string;
  is_correct?: boolean | null;
  concept?: string | null;
  error_type?: string | null;
  student_text?: string;
}
interface HomeworkImageDTO {
  filename: string;
  key: string;
  url?: string | null;
}
interface TurnHistoryItem {
  turn: number;
  homework_files: HomeworkImageDTO[];
  ai_feedback: AiFeedback | null;
}
interface ConversationHistory {
  conversation_id: string;
  conversation_name: string;
  history: TurnHistoryItem[];
}

// ---------- helpers ----------
const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, b64] = dataUrl.split(",");
  const mime = header.match(/data:(.*?);/)?.[1] ?? "image/jpeg";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function buildTurnForm(
  conversationName: string,
  turnNumber: number,
  text: string,
  images: string[],
): FormData {
  const fd = new FormData();
  fd.append("conversation_name", conversationName);
  fd.append("turn_number", String(turnNumber));
  if (text) fd.append("student_text", text);
  images.forEach((dataUrl, i) => {
    const blob = dataUrlToBlob(dataUrl);
    const ext = MIME_EXT[blob.type] ?? "jpg";
    fd.append("images", blob, `homework_${i}.${ext}`);
  });
  return fd;
}

function historyToHomework(h: ConversationHistory): Homework {
  const messages: ChatMessage[] = [];
  const allImages: string[] = [];

  for (const turn of h.history) {
    const imgs = turn.homework_files.map((f) => f.url).filter((u): u is string => Boolean(u));
    allImages.push(...imgs);

    const studentText = turn.ai_feedback?.student_text;
    if (imgs.length || studentText) {
      messages.push({
        id: `t${turn.turn}-student`,
        role: "student",
        text: studentText,
        images: imgs.length ? imgs : undefined,
        createdAt: turn.turn,
      });
    }
    const reply = turn.ai_feedback?.reply;
    if (reply) {
      messages.push({
        id: `t${turn.turn}-tutor`,
        role: "tutor",
        text: reply,
        createdAt: turn.turn,
      });
    }
  }

  return {
    id: h.conversation_id,
    title: h.conversation_name,
    subject: "Math",
    status: "reviewing",
    coverImage: allImages[0],
    images: allImages,
    messages,
    createdAt: 0,
    updatedAt: 0,
  };
}

// ---------- ADAPTIVE NEXT-STEP ----------
export interface NextStep {
  concept: string | null;
  he_name: string | null;
  difficulty: string | null;
  practice_problem: string | null;
}

// Proactive recommendation of what this student should practice next, derived
// from their accumulated mastery profile. Returns null when nothing is due.
export async function getNextStep(opts?: { generate?: boolean }): Promise<NextStep | null> {
  const sid = studentId();
  const { data } = await api.get<NextStep>(`/students/${sid}/next`, {
    params: opts?.generate ? { generate: true } : undefined,
  });
  return data.concept ? data : null;
}

export interface ConceptOption {
  concept: string;
  he_name: string;
  in_grade: boolean;
}

// The subjects a student can pick to practice (grade-appropriate first).
export async function listConcepts(): Promise<ConceptOption[]> {
  const sid = studentId();
  const { data } = await api.get<ConceptOption[]>(`/students/${sid}/concepts`);
  return data;
}

export interface PracticeStart {
  conversation_id: string;
  concept: string;
  he_name: string;
  difficulty: string;
  problem: string;
}

// Start a practice session: the backend generates a grade-aligned problem for the
// chosen (or recommended) concept and opens a new conversation seeded with it.
// Returns the new conversation id so the caller can navigate straight into chat.
export async function startPractice(concept?: string): Promise<PracticeStart> {
  const sid = studentId();
  const { data } = await api.post<PracticeStart>(`/students/${sid}/practice`, null, {
    params: concept ? { concept } : undefined,
  });
  return data;
}

// ---------- HOMEWORK ----------
export async function listHomeworks(): Promise<Homework[]> {
  const sid = studentId();
  const { data } = await api.get<ConversationSummary[]>(`/students/${sid}/conversations`);
  return data.map((c) => ({
    id: c.id,
    title: c.name,
    subject: "Math",
    status: "reviewing" as HomeworkStatus,
    coverImage: c.cover_image_url ?? undefined,
    images: [],
    messages: [],
    createdAt: 0,
    updatedAt: 0,
    assignedBy: c.assigned_by ?? undefined,
  }));
}

export async function getHomework(id: string): Promise<Homework | null> {
  const sid = studentId();
  try {
    const { data } = await api.get<ConversationHistory>(`/students/${sid}/conversations/${id}`);
    return historyToHomework(data);
  } catch (e) {
    if (axios.isAxiosError(e) && e.response?.status === 404) return null;
    throw e;
  }
}

export async function createHomework(input: {
  title: string;
  subject: string;
  images: string[];
}): Promise<Homework> {
  const sid = studentId();
  const name = input.title || "Untitled homework";
  const { data: convo } = await api.post<ConversationSummary>(`/students/${sid}/conversations`, {
    name,
  });
  // Turn 0: upload the homework photos; the backend grades + tutors.
  const form = buildTurnForm(name, 0, "", input.images);
  await api.post(`/students/${sid}/conversations/${convo.id}/turn`, form);
  return (
    (await getHomework(convo.id)) ?? {
      id: convo.id,
      title: name,
      subject: input.subject || "Math",
      status: "reviewing",
      coverImage: input.images[0],
      images: input.images,
      messages: [],
      createdAt: 0,
      updatedAt: 0,
    }
  );
}

export async function appendMessage(
  homeworkId: string,
  msg: Omit<ChatMessage, "id" | "createdAt">,
): Promise<ChatMessage> {
  const sid = studentId();
  // The backend keys turns by index and stores the conversation name on each
  // turn, so fetch the current history to learn both.
  const { data: hist } = await api.get<ConversationHistory>(
    `/students/${sid}/conversations/${homeworkId}`,
  );
  const nextTurn = hist.history.length;
  const form = buildTurnForm(hist.conversation_name, nextTurn, msg.text ?? "", msg.images ?? []);
  await api.post(`/students/${sid}/conversations/${homeworkId}/turn`, form);
  return { ...msg, id: uid(), createdAt: Date.now() };
}
