// API client for the Rahati backend (woman / "user" role).
// Every call is recorded in a small in-memory log (handy when testing against a local backend).
import { getItem, setItem } from "./storage";
import { t } from "./i18n";

// ---------- types (mirrors Backend/rahati/serializers.py and views.py) ----------
export type Lang = "ar" | "fr" | "en";
export type Me = { id: number; nickname: string; role: string; language: Lang };
export type CheckIn = { id: number; checkin_date: string; mood: number; energy: number; topics: string[] };
export type Topic = { code: string; name: string };
export type JournalEntry = { id: number; body: string; check_in: number | null; created_at: string };
export type TodoStatus = "open" | "done" | "overdue";
export type Todo = {
  id: number;
  title: string;
  card: number | null;
  assigned_by: number | null;
  due_date: string | null;
  done_at: string | null;
  created_at: string;
  source: "self" | "card" | "professional";
  status: TodoStatus;
  assigned_by_name: string | null;
};
export type Card = {
  id: number;
  title: string;
  body: string;
  action: string;
  support_note: string;
  pattern: string | null;
  topic: string | null;
  topic_name: string | null;
  read?: boolean;
  has_open_todo?: boolean;
  source: "platform" | "professional";
  author_name: string | null;
  reviewed_by_name: string | null;
  language: Lang;
};
export type Wilaya = { code: string; name: string };
export type Mode = "in_person" | "online";
export type TimeOfDay = "morning" | "afternoon" | "evening";
export type Professional = {
  id: number;
  name: string;
  bio: string;
  city: string;
  wilaya: string | null;
  wilaya_name: string | null;
  modes: Mode[];
  next_slot: string;
  free_slots_in_window: number;
};
export type Slot = { id: number; starts_at: string; ends_at: string; mode: Mode };
export type CalendarDay = { date: string; modes: Mode[]; free_slots: number };
export type SessionStatus = "requested" | "accepted" | "declined" | "cancelled" | "completed";
export type Session = {
  id: number;
  slot: number;
  professional: number;
  starts_at: string;
  mode: Mode;
  status: SessionStatus;
  meeting_link?: string;
  professional_address?: string | null;
  created_at: string;
};
/** Written by the backend's background jobs; empty until those run. */
export type Patterns = {
  patterns: { type: string; from: string; to: string; value: number | null }[];
  summary: { week_start: string; body: string } | null;
};
export type Analytics = {
  range: 7 | 30 | 90;
  start_date: string;
  end_date: string;
  check_in_count: number;
  average_mood: number | null;
  average_energy: number | null;
  previous_average_mood: number | null;
  mood_change: number | null;
  check_in_streak: number;
  lowest_mood: number | null;
  lowest_mood_dates: string[];
  series: { date: string; mood: number | null; energy: number | null }[];
  topics: { code: string; count: number }[];
};
export type Page<T> = { count: number; next: string | null; previous: string | null; results: T[] };
export type ConsentCategory = "mood" | "journal" | "cycle";
export type Consent = { professional: number; category: ConsentCategory };

// ---------- config ----------
const K_URL = "rahati.server";
const K_ACCESS = "rahati.access";
const K_REFRESH = "rahati.refresh";

// The deployed Rahati backend, unless EXPO_PUBLIC_API_URL points somewhere else (e.g. a local one).
const DEFAULT_URL = (process.env.EXPO_PUBLIC_API_URL || "https://rahati-38bh.onrender.com").replace(/\/+$/, "");

let baseUrl = DEFAULT_URL;
let access: string | null = null;
let refresh: string | null = null;
let onSignedOut: (() => void) | null = null;

export async function loadConfig() {
  baseUrl = (await getItem(K_URL)) || DEFAULT_URL;
  access = await getItem(K_ACCESS);
  refresh = await getItem(K_REFRESH);
  return { baseUrl, signedIn: !!refresh };
}
export const getServer = () => baseUrl;
export const defaultServer = DEFAULT_URL;
/** What the screen shows instead of the raw address: never an IP, so screen recordings stay private. */
export function serverLabel(url: string = baseUrl): string {
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    return "Custom server";
  }
  if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$)/.test(host)) return "Local test server";
  if (/^[\d.]+$|:/.test(host)) return "Custom server"; // any other raw IP
  return host;
}
export async function setServer(url: string) {
  baseUrl = url.trim().replace(/\/+$/, "") || DEFAULT_URL;
  await setItem(K_URL, baseUrl);
}
export function setSignedOutHandler(fn: () => void) {
  onSignedOut = fn;
}
async function saveTokens(a: string | null, r: string | null) {
  access = a;
  refresh = r;
  await setItem(K_ACCESS, a);
  await setItem(K_REFRESH, r);
}

// ---------- request log ----------
export type LogEntry = {
  id: number;
  at: Date;
  method: string;
  path: string;
  status: number | null;
  ms: number;
  body?: unknown;
  response?: unknown;
};
let logSeq = 0;
const log: LogEntry[] = [];
const logListeners = new Set<() => void>();
export const getLog = () => log;
export function subscribeLog(fn: () => void) {
  logListeners.add(fn);
  return () => logListeners.delete(fn);
}
function record(e: Omit<LogEntry, "id">) {
  // Never keep passwords or tokens in the log.
  const scrub = (v: unknown): unknown => {
    if (!v || typeof v !== "object") return v;
    const out: Record<string, unknown> = Array.isArray(v) ? ([] as never) : {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      out[k] = /password|token|refresh|access/i.test(k) ? "•••" : val;
    }
    return out;
  };
  log.unshift({ ...e, id: ++logSeq, body: scrub(e.body), response: scrub(e.response) });
  if (log.length > 100) log.pop();
  logListeners.forEach((fn) => fn());
}
export function clearLog() {
  log.length = 0;
  logListeners.forEach((fn) => fn());
}

// ---------- errors ----------
export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(status: number, data: unknown) {
    super(describe(status, data));
    this.status = status;
    this.data = data;
  }
}
function describe(status: number, data: unknown): string {
  if (status === 0) return t("Can't reach Rahati right now. Check your connection and try again.");
  if (status === 429) return t("Too many requests. Wait a moment and try again.");
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    if (typeof d.detail === "string") return d.detail;
    const parts = Object.entries(d).map(([k, v]) => {
      const msg = Array.isArray(v) ? v.join(" ") : typeof v === "string" ? v : JSON.stringify(v);
      return k === "non_field_errors" ? msg : `${k.replace(/_/g, " ")}: ${msg}`;
    });
    if (parts.length) return parts.join("\n");
  }
  if (status >= 500) return t("The server had a problem. Try again.");
  return t("Request failed ({status}).", { status });
}
export const errorText = (e: unknown) =>
  e instanceof ApiError ? e.message : e instanceof Error ? e.message : t("Something went wrong.");

// ---------- core request ----------
type Opts = { method?: string; body?: unknown; query?: Record<string, string | number | undefined>; auth?: boolean };

async function raw(path: string, o: Opts, token: string | null) {
  const qs = o.query
    ? Object.entries(o.query)
        .filter(([, v]) => v !== undefined && v !== "")
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join("&")
    : "";
  const url = `${baseUrl}/api/${path}${qs ? `?${qs}` : ""}`;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (o.body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  const t0 = Date.now();
  let res: Response;
  try {
    res = await fetch(url, {
      method: o.method || "GET",
      headers,
      body: o.body !== undefined ? JSON.stringify(o.body) : undefined,
    });
  } catch {
    record({ at: new Date(), method: o.method || "GET", path: `/api/${path}`, status: null, ms: Date.now() - t0, body: o.body });
    throw new ApiError(0, null);
  }
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  record({
    at: new Date(),
    method: o.method || "GET",
    path: `/api/${path}${qs ? `?${qs}` : ""}`,
    status: res.status,
    ms: Date.now() - t0,
    body: o.body,
    response: data,
  });
  return { status: res.status, data };
}

let refreshing: Promise<boolean> | null = null;
async function tryRefresh(): Promise<boolean> {
  if (!refresh) return false;
  refreshing ??= (async () => {
    const r = await raw("auth/refresh", { method: "POST", body: { refresh } }, null).catch(() => null);
    if (r && r.status === 200) {
      const d = r.data as { access: string; refresh?: string };
      await saveTokens(d.access, d.refresh ?? refresh);
      return true;
    }
    return false;
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

export async function request<T>(path: string, o: Opts = {}): Promise<T> {
  const auth = o.auth !== false;
  let r = await raw(path, o, auth ? access : null);
  if (auth && r.status === 401) {
    if (await tryRefresh()) r = await raw(path, o, access);
    else {
      await saveTokens(null, null);
      onSignedOut?.();
    }
  }
  if (r.status >= 400) throw new ApiError(r.status, r.data);
  return r.data as T;
}

// ---------- endpoints ----------
export const api = {
  // auth and account
  register: (b: { nickname: string; password: string; language: Lang; email?: string; phone?: string }) =>
    request<{ id: number; nickname: string }>("auth/register", { method: "POST", body: b, auth: false }),
  async login(nickname: string, password: string) {
    const d = await request<{ access: string; refresh: string }>("auth/login", {
      method: "POST",
      body: { username: nickname, password },
      auth: false,
    });
    await saveTokens(d.access, d.refresh);
  },
  async logout() {
    try {
      if (refresh) await request("auth/logout", { method: "POST", body: { refresh } });
    } finally {
      await saveTokens(null, null);
    }
  },
  changePassword: (current_password: string, new_password: string) =>
    request<{ detail: string }>("auth/change-password", { method: "POST", body: { current_password, new_password } }),
  me: () => request<Me>("me"),
  async deleteMe() {
    await request("me", { method: "DELETE" });
    await saveTokens(null, null);
  },

  // tracking
  topics: () => request<Topic[]>("topics"),
  checkIns: () => request<CheckIn[]>("check-ins"),
  checkIn: (b: { checkin_date: string; mood: number; energy: number; topics?: string[] }) =>
    request<CheckIn>("check-ins", { method: "POST", body: b }),
  analytics: (range: 7 | 30 | 90) => request<Analytics>("analytics", { query: { range } }),
  summary: (range: 7 | 30 | 90) =>
    request<{ range: number; summary: string; analytics: Analytics }>("analytics", { method: "POST", body: { range } }),
  patterns: () => request<Patterns>("patterns"),
  cycleStart: (start_date: string) =>
    request<{ id: number; start_date: string }>("cycle-starts", { method: "POST", body: { start_date } }),
  journal: () => request<JournalEntry[] | { results: JournalEntry[] }>("journal").then(unpage),
  addJournal: (b: { body: string; check_in?: number | null }) =>
    request<JournalEntry>("journal", { method: "POST", body: b }),

  // content and to-dos
  cards: () => request<Card[]>("content-cards"),
  library: (q: { topic?: string; limit?: number; offset?: number } = {}) =>
    request<Page<Card>>("content-cards/library", { query: q }),
  card: (id: number) => request<Card>(`content-cards/${id}`),
  markRead: (id: number) => request<null>(`content-cards/${id}/read`, { method: "POST" }),
  addCardTodo: (id: number) => request<Todo>(`content-cards/${id}/add-todo`, { method: "POST" }),
  todos: (status?: TodoStatus) =>
    request<Todo[] | { results: Todo[] }>("todos", { query: { status } }).then(unpage),
  addTodo: (b: { title: string; due_date?: string | null }) => request<Todo>("todos", { method: "POST", body: b }),
  editTodo: (id: number, b: { title?: string; due_date?: string | null }) =>
    request<Todo>(`todos/${id}`, { method: "PATCH", body: b }),
  deleteTodo: (id: number) => request<null>(`todos/${id}`, { method: "DELETE" }),
  completeTodo: (id: number) => request<Todo>(`todos/${id}/complete`, { method: "POST" }),
  reopenTodo: (id: number) => request<Todo>(`todos/${id}/reopen`, { method: "POST" }),

  // finding a professional
  wilayas: () => request<Wilaya[]>("wilayas"),
  professionals: (q: { mode?: Mode; wilaya?: string; from?: string; to?: string; time_of_day?: TimeOfDay; limit?: number; offset?: number }) =>
    request<Professional[]>("professionals", { query: q }),
  slots: (proId: number, q: { mode?: Mode; limit?: number; offset?: number } = {}) =>
    request<Slot[]>(`professionals/${proId}/slots`, { query: q }),
  calendar: (proId: number, month: string, mode?: Mode) =>
    request<CalendarDay[]>(`professionals/${proId}/calendar`, { query: { month, mode } }),

  // sessions and consent
  sessions: () => request<Session[]>("sessions"),
  session: (id: number) => request<Session>(`sessions/${id}`),
  book: (slot: number) => request<Session>("sessions", { method: "POST", body: { slot } }),
  cancelSession: (id: number) => request<Session>(`sessions/${id}`, { method: "PATCH", body: { status: "cancelled" } }),
  consents: () => request<Consent[]>("consents"),
  setConsent: (professional: number, category: ConsentCategory, granted: boolean) =>
    request<{ category: ConsentCategory; granted: boolean }>("consents", {
      method: "PUT",
      body: { professional, category, granted },
    }),
};

function unpage<T>(d: T[] | { results: T[] }): T[] {
  return Array.isArray(d) ? d : d.results;
}

// Professionals seen in the directory, so a session (which only carries the
// professional id) can show a name.
const K_PROS = "rahati.pros";
let proNames: Record<number, Pick<Professional, "name" | "city" | "wilaya_name">> = {};
export async function loadProNames() {
  try {
    proNames = JSON.parse((await getItem(K_PROS)) || "{}");
  } catch {
    proNames = {};
  }
}
export async function rememberPros(list: Professional[]) {
  for (const p of list) proNames[p.id] = { name: p.name, city: p.city, wilaya_name: p.wilaya_name };
  await setItem(K_PROS, JSON.stringify(proNames));
}
export const proName = (id: number) => proNames[id]?.name ?? t("Professional #{id}", { id });
export const proInfo = (id: number) => proNames[id];
