import { authenticatedFetch } from "@/lib/auth";

type RequestMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

interface ApiRequestOptions {
  method?: RequestMethod;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
}

function buildQuery(params?: ApiRequestOptions["params"]) {
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

  if (body !== undefined && !(body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await authenticatedFetch(`${path}${buildQuery(params)}`, {
    method,
    headers,
    ...(body !== undefined
      ? {
          body: body instanceof FormData ? body : JSON.stringify(body),
        }
      : {}),
  });

  return response as T;
}

/* --------------------------------------------------
   Authentication and professional profile
-------------------------------------------------- */

export const professionalApi = {
  getProfile: () => apiRequest("/api/pro/profile"),

  updateProfile: (data: Record<string, unknown>) =>
    apiRequest("/api/pro/profile", {
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

/* --------------------------------------------------
   Professional calendar and availability
-------------------------------------------------- */

export const calendarApi = {
  getCalendar: (from: string, to: string) =>
    apiRequest("/api/pro/calendar", {
      params: { from, to },
    }),

  getAvailability: () => apiRequest("/api/pro/availability"),

  createAvailability: (data: Record<string, unknown>) =>
    apiRequest("/api/pro/availability", {
      method: "POST",
      body: data,
    }),

  updateAvailability: (data: Record<string, unknown>) =>
    apiRequest("/api/pro/availability", {
      method: "PATCH",
      body: data,
    }),

  deleteAvailability: (data: Record<string, unknown>) =>
    apiRequest("/api/pro/availability", {
      method: "DELETE",
      body: data,
    }),

  getSlots: () => apiRequest("/api/pro/slots"),

  createSlot: (data: Record<string, unknown>) =>
    apiRequest("/api/pro/slots", {
      method: "POST",
      body: data,
    }),

  updateSlot: (data: Record<string, unknown>, id?: number) =>
    apiRequest("/api/pro/slots", {
      method: "PATCH",
      body: data,
      params: id ? { id } : undefined,
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

/* --------------------------------------------------
   Sessions and requests
-------------------------------------------------- */

export const sessionsApi = {
  getAll: () => apiRequest("/api/sessions"),

  getOne: (id: number) => apiRequest(`/api/sessions/${id}`),

  update: (id: number, data: Record<string, unknown>) =>
    apiRequest(`/api/sessions/${id}`, {
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

/* --------------------------------------------------
   Patients and patient tasks
-------------------------------------------------- */

export const patientsApi = {
  getAll: () => apiRequest("/api/pro/patients"),

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
