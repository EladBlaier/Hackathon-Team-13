import axios from "axios";
// Centralized API stubs. Backend dev: replace these with real fetch calls.
// All functions return Promises and use mocked data persisted to localStorage.

export type HomeworkStatus = "pending" | "reviewing" | "completed";

export interface ChatMessage {
  id: string;
  role: "student" | "tutor";
  text?: string;
  images?: string[]; // data URLs
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
}

export interface User {
  id: string;
}

const USER_KEY = "mh_user";
const HW_KEY = "mh_homeworks";

const delay = (ms = 350) => new Promise((r) => setTimeout(r, ms));
const uid = () => Math.random().toString(36).slice(2, 10);

export const api = axios.create({
  baseURL: "http://localhost:8000",
});

export async function getHomeworks(): Promise<Homework[]> {
  const studentId = JSON.parse(localStorage.getItem(USER_KEY) ?? "null")?.id;
  const { data } = await api.get(`/students/${studentId}/conversations`);
  return data; // ← will likely need mapping once we see the real shape
}
function writeHW(list: Homework[]) {
  localStorage.setItem(HW_KEY, JSON.stringify(list));
}

// ---------- AUTH ----------
export async function login(id: string): Promise<User> {
  await delay();
  const user: User = { id };
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

// ---------- HOMEWORK ----------
export async function listHomeworks(): Promise<Homework[]> {
  await delay(150);
  return (await getHomeworks()).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getHomework(id: string): Promise<Homework | null> {
  await delay(100);
  return (await getHomeworks()).find((h) => h.id === id) ?? null;
}

export async function createHomework(input: {
  title: string;
  subject: string;
  images: string[];
}): Promise<Homework> {
  await delay();
  const now = Date.now();
  const hw: Homework = {
    id: uid(),
    title: input.title || "Untitled homework",
    subject: input.subject || "Math",
    status: "reviewing",
    coverImage: input.images[0],
    images: input.images,
    messages: [
      {
        id: uid(),
        role: "student",
        images: input.images,
        createdAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
  const list = await getHomeworks();
  list.push(hw);
  writeHW(list);
  // Kick off mock AI first response
  void mockTutorReply(hw.id, "intro");
  return hw;
}

export async function appendMessage(
  homeworkId: string,
  msg: Omit<ChatMessage, "id" | "createdAt">,
): Promise<ChatMessage> {
  await delay(120);
  const list = await getHomeworks();
  const hw = list.find((h) => h.id === homeworkId);
  if (!hw) throw new Error("Homework not found");
  const message: ChatMessage = { ...msg, id: uid(), createdAt: Date.now() };
  hw.messages.push(message);
  hw.updatedAt = Date.now();
  if (msg.images?.length) hw.images.push(...msg.images);
  writeHW(list);
  if (msg.role === "student") void mockTutorReply(homeworkId, "follow");
  return message;
}

// ---------- AI (mocked — replace with real agent call) ----------
// Replace this entire function with a call to your AI endpoint.
async function mockTutorReply(homeworkId: string, kind: "intro" | "follow") {
  await delay(900 + Math.random() * 800);
  const list = await getHomeworks();
  const hw = list.find((h) => h.id === homeworkId);
  if (!hw) return;
  const text =
    kind === "intro"
      ? "Got your homework! I can see your problems clearly. Let's start with question 1 — can you walk me through how you set it up?"
      : "Nice — that step looks right. What do you think comes next?";
  hw.messages.push({
    id: uid(),
    role: "tutor",
    text,
    createdAt: Date.now(),
  });
  hw.updatedAt = Date.now();
  writeHW(list);
  window.dispatchEvent(new CustomEvent("hw:update", { detail: homeworkId }));
}

export async function deleteHomework(id: string) {
  await delay(100);
  writeHW((await getHomeworks()).filter((h) => h.id !== id));
}
