import { authenticatedFetch } from "@/lib/auth";

export type SessionStatus =
  | "requested"
  | "accepted"
  | "declined"
  | "cancelled"
  | "completed";

export type SessionMode = "online" | "in_person";

export interface ProfessionalProfileData {
  display_name: string;
  bio: string;
  city: string;
  address: string;
  wilaya: string;
  credential_kind?: string;
  status?: string;
  credential_uploaded_at?: string | null;
}

export type ProfessionalProfile = ProfessionalProfileData;

export interface Wilaya {
  code: string;
  name: string;
}

export interface ProfessionalSession {
  id: number;
  slot?: number | null;
  professional?: number;
  starts_at: string;
  ends_at?: string;
  mode: SessionMode;
  status: SessionStatus;
  meeting_link?: string | null;
  professional_address?: string | null;
  created_at?: string;
}

export interface CalendarItem {
  id: number;
  starts_at: string;
  ends_at: string;
  mode: SessionMode;
  state: string;
  free: boolean;
}

export type CalendarSlot = CalendarItem;

export interface WeeklyAvailability {
  id: number;
  weekday: number;
  starts_at: string;
  ends_at: string;
  mode: SessionMode;
  is_active: boolean;
}

export interface ProfessionalPatient {
  id: number;
  nickname: string;
  shared: string[];
  todos: {
    open: number;
    done: number;
    overdue: number;
  };
}

export type Patient = ProfessionalPatient;

export interface PatientTodo {
  id: number;
  title: string;
  description?: string;
  is_completed?: boolean;
  completed?: boolean;
  due_date?: string | null;
  done_at?: string | null;
  created_at?: string;
}

export interface CreateSlotPayload {
  starts_at: string;
  ends_at: string;
  mode: SessionMode;
}

export interface CreateTodoPayload {
  title: string;
  description?: string;
  due_date?: string | null;
}

export type TodoUpdatePayload = Partial<CreateTodoPayload> & {
  is_completed?: boolean;
  completed?: boolean;
  done_at?: string | null;
};

const API_PREFIX = "/api";

function apiPath(path: string) {
  const clean = path.startsWith("/") ? path : `/${path}`;

  if (clean === API_PREFIX || clean.startsWith(`${API_PREFIX}/`)) {
    return clean;
  }

  return `${API_PREFIX}${clean}`;
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const result = await authenticatedFetch(apiPath(path), {
    ...options,
    headers,
  });

  // Support authenticatedFetch implementations that return a Response.
  if (
    result &&
    typeof result === "object" &&
    "ok" in result &&
    "status" in result
  ) {
    const response = result as Response;

    if (!response.ok) {
      const raw = await response.text();
      let message = `Request failed (${response.status}).`;

      try {
        const parsed = JSON.parse(raw);
        message =
          parsed.detail ||
          parsed.message ||
          Object.values(parsed).flat().join(" ") ||
          message;
      } catch {
        // Avoid displaying Django's full HTML error page.
        if (raw && !raw.trimStart().startsWith("<")) {
          message = raw;
        }
      }

      throw new Error(message);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  // Support helpers that already return parsed JSON.
  return result as T;
}

function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];

  if (data && typeof data === "object") {
    const value = data as {
      results?: T[];
      data?: T[];
    };

    if (Array.isArray(value.results)) return value.results;
    if (Array.isArray(value.data)) return value.data;
  }

  return [];
}

function queryString(params: Record<string, string>) {
  return new URLSearchParams(params).toString();
}

/* PROFILE */

export async function getProfile() {
  return apiRequest<ProfessionalProfileData>("/pro/profile");
}

export async function updateProfile(data: Partial<ProfessionalProfileData>) {
  return apiRequest<ProfessionalProfileData>("/pro/profile", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function getWilayas() {
  const data = await apiRequest<unknown>("/wilayas");
  return unwrapList<Wilaya>(data);
}

/* SESSIONS AND REQUESTS */

export async function getSessions() {
  const data = await apiRequest<unknown>("/sessions");
  return unwrapList<ProfessionalSession>(data);
}

export async function updateSession(
  id: number,
  status: SessionStatus | Partial<ProfessionalSession>,
) {
  const payload = typeof status === "string" ? { status } : status;

  return apiRequest<ProfessionalSession>(`/sessions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

/* CALENDAR */

export async function getCalendar(from: string, to: string) {
  const query = queryString({ from, to });
  const data = await apiRequest<unknown>(`/pro/calendar?${query}`);
  return unwrapList<CalendarItem>(data);
}

export async function createSlot(data: CreateSlotPayload) {
  return apiRequest<CalendarItem>("/pro/slots", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateSlot(id: number, data: Partial<CreateSlotPayload>) {
  return apiRequest<CalendarItem>("/pro/slots", {
    method: "PATCH",
    body: JSON.stringify({ id, ...data }),
  });
}

export async function deleteSlot(id: number) {
  return apiRequest<void>("/pro/slots", {
    method: "DELETE",
    body: JSON.stringify({ id }),
  });
}

/* WEEKLY AVAILABILITY */

export async function getAvailability() {
  const data = await apiRequest<unknown>("/pro/availability");
  return unwrapList<WeeklyAvailability>(data);
}

export async function createAvailability(data: Omit<WeeklyAvailability, "id">) {
  return apiRequest<WeeklyAvailability>("/pro/availability", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateAvailability(
  id: number,
  data: Partial<Omit<WeeklyAvailability, "id">>,
) {
  return apiRequest<WeeklyAvailability>("/pro/availability", {
    method: "PATCH",
    body: JSON.stringify({ id, ...data }),
  });
}

export async function deleteAvailability(id: number) {
  return apiRequest<void>("/pro/availability", {
    method: "DELETE",
    body: JSON.stringify({ id }),
  });
}

/* PATIENTS */

export async function getPatients() {
  const data = await apiRequest<unknown>("/pro/patients");
  return unwrapList<ProfessionalPatient>(data);
}

/* PATIENT ACTIONS */

export async function getPatientTodos(patientId: number) {
  const data = await apiRequest<unknown>(`/pro/patients/${patientId}/todos`);

  return unwrapList<PatientTodo>(data);
}

export async function createPatientTodo(
  patientId: number,
  data: CreateTodoPayload,
) {
  return apiRequest<PatientTodo>(`/pro/patients/${patientId}/todos`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updatePatientTodo(
  patientId: number,
  todoId: number,
  data: TodoUpdatePayload,
) {
  return apiRequest<PatientTodo>(`/pro/patients/${patientId}/todos/${todoId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deletePatientTodo(patientId: number, todoId: number) {
  return apiRequest<void>(`/pro/patients/${patientId}/todos/${todoId}`, {
    method: "DELETE",
  });
}
