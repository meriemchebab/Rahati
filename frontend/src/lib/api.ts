import { authenticatedFetch } from "@/lib/auth";

type RequestMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

interface ApiRequestOptions {
  method?: RequestMethod;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
}

export interface ProfessionalProfileData {
  display_name: string;
  bio: string;
  city: string;
  address: string;
  wilaya: string;
  credential_kind: string;
  status: string;
  credential_uploaded_at: string | null;
}

export interface CalendarSlot {
  id: number;
  starts_at: string;
  ends_at: string;
  mode: "in_person" | "online";
}

export interface WeeklyAvailability {
  id: number;
  weekday: number;
  starts_at: string;
  ends_at: string;
  mode: "in_person" | "online";
  is_active: boolean;
}

export interface ProfessionalSession {
  id: number;
  slot: number;
  professional: number;
  starts_at: string;
  mode: "in_person" | "online";
  status: string;
  meeting_link?: string;
  professional_address?: string;
  created_at: string;
}

export interface Patient {
  id: number;
  nickname: string;
  shared: boolean;
  todos: {
    open: number;
    done: number;
    overdue: number;
  };
}

function buildQuery(params?: ApiRequestOptions["params"]): string {
  if (!params) return "";

  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      query.set(key, String(value));
    }
  });

  const result = query.toString();
  return result ? `?${result}` : "";
}

export async function apiRequest<T = unknown>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { method = "GET", body, params } = options;

  const headers = new Headers();

  if (
    body !== undefined &&
    !(typeof FormData !== "undefined" && body instanceof FormData)
  ) {
    headers.set("Content-Type", "application/json");
  }

  return authenticatedFetch(`${path}${buildQuery(params)}`, {
    method,
    headers,
    ...(body !== undefined
      ? {
          body:
            typeof FormData !== "undefined" && body instanceof FormData
              ? body
              : JSON.stringify(body),
        }
      : {}),
  }) as Promise<T>;
}

/* ---------------- Professional profile ---------------- */

export const professionalApi = {
  getProfile: () => apiRequest<ProfessionalProfileData>("/api/pro/profile"),

  updateProfile: (
    data: Partial<
      Pick<
        ProfessionalProfileData,
        "display_name" | "bio" | "city" | "address" | "wilaya"
      >
    >,
  ) =>
    apiRequest<ProfessionalProfileData>("/api/pro/profile", {
      method: "PATCH",
      body: data,
    }),

  getCredential: () => apiRequest("/api/pro/profile/credential"),

  updateCredential: (formData: FormData) =>
    apiRequest("/api/pro/profile/credential", {
      method: "PUT",
      body: formData,
    }),
};

/* ---------------- Calendar and availability ---------------- */

export const calendarApi = {
  getCalendar: (from: string, to: string) =>
    apiRequest<CalendarSlot[]>("/api/pro/calendar", {
      params: { from, to },
    }),

  getAvailability: () =>
    apiRequest<WeeklyAvailability[]>("/api/pro/availability"),

  createAvailability: (data: Omit<WeeklyAvailability, "id">) =>
    apiRequest<WeeklyAvailability>("/api/pro/availability", {
      method: "POST",
      body: data,
    }),

  updateAvailability: (data: Partial<WeeklyAvailability> & { id: number }) =>
    apiRequest("/api/pro/availability", {
      method: "PATCH",
      body: data,
    }),

  deleteAvailability: (data: { id: number }) =>
    apiRequest("/api/pro/availability", {
      method: "DELETE",
      body: data,
    }),

  getSlots: () => apiRequest<CalendarSlot[]>("/api/pro/slots"),

  createSlot: (data: Omit<CalendarSlot, "id">) =>
    apiRequest<CalendarSlot>("/api/pro/slots", {
      method: "POST",
      body: data,
    }),

  updateSlot: (data: Partial<CalendarSlot> & { id: number }) =>
    apiRequest("/api/pro/slots", {
      method: "PATCH",
      body: data,
    }),

  deleteSlot: (id: number) =>
    apiRequest("/api/pro/slots", {
      method: "DELETE",
      params: { id },
    }),

  getTimeOff: () => apiRequest("/api/pro/time-off"),

  createTimeOff: (from: string, to: string) =>
    apiRequest("/api/pro/time-off", {
      method: "POST",
      body: { from, to },
    }),

  deleteTimeOff: (data: Record<string, unknown>) =>
    apiRequest("/api/pro/time-off", {
      method: "DELETE",
      body: data,
    }),
};

/* ---------------- Sessions and requests ---------------- */

export const sessionsApi = {
  getAll: () => apiRequest<ProfessionalSession[]>("/api/sessions"),

  getOne: (id: number) =>
    apiRequest<ProfessionalSession>(`/api/sessions/${id}`),

  update: (id: number, data: Record<string, unknown>) =>
    apiRequest<ProfessionalSession>(`/api/sessions/${id}`, {
      method: "PATCH",
      body: data,
    }),

  getNote: (sessionId: number) =>
    apiRequest(`/api/pro/sessions/${sessionId}/note`),

  saveNote: (sessionId: number, data: Record<string, unknown>) =>
    apiRequest(`/api/pro/sessions/${sessionId}/note`, {
      method: "PUT",
      body: data,
    }),
};

/* ---------------- Patients ---------------- */

export const patientsApi = {
  getAll: () => apiRequest<Patient[]>("/api/pro/patients"),

  getTasks: (patientId: number) =>
    apiRequest(`/api/pro/patients/${patientId}/todos`),

  createTask: (patientId: number, data: Record<string, unknown>) =>
    apiRequest(`/api/pro/patients/${patientId}/todos`, {
      method: "POST",
      body: data,
    }),

  updateTask: (
    patientId: number,
    taskId: number,
    data: Record<string, unknown>,
  ) =>
    apiRequest(`/api/pro/patients/${patientId}/todos/${taskId}`, {
      method: "PATCH",
      body: data,
    }),

  deleteTask: (patientId: number, taskId: number) =>
    apiRequest(`/api/pro/patients/${patientId}/todos/${taskId}`, {
      method: "DELETE",
    }),

  getCheckIns: (patientId: number) =>
    apiRequest(`/api/pro/patients/${patientId}/check-ins`),

  getJournal: (patientId: number) =>
    apiRequest(`/api/pro/patients/${patientId}/journal`),

  getCycle: (patientId: number) =>
    apiRequest(`/api/pro/patients/${patientId}/cycle`),
};
