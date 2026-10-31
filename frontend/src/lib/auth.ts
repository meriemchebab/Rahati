const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

const ACCESS_KEY = "rahati_access";
const REFRESH_KEY = "rahati_refresh";

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface ProfessionalRegistrationData {
  nickname: string;
  password: string;
  language: "ar" | "fr" | "en";
  email: string;
  phone: string;
  display_name: string;
  bio: string;
  city: string;
  address: string;
  credential_kind: "diploma" | "licence" | "certificate" | "other";
  credential_file: File;
  terms_accepted: boolean;
}

export interface RegistrationResponse {
  id: number;
  nickname: string;
  status: string;
}

export interface AuthUser {
  id: number;
  nickname: string;
  role: string;
  language: string;
}

export interface ProfessionalProfile {
  display_name: string;
  bio: string;
  city: string;
  address: string;
  wilaya: string;
  credential_kind: string;
  status: string;
  credential_uploaded_at: string | null;
}

interface TokenResponse {
  access: string;
  refresh: string;
}

// Prevent multiple simultaneous refresh requests.
let refreshPromise: Promise<string> | null = null;

function getApiUrl() {
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured.");
  }

  return API_URL;
}

export function saveTokens(tokens: TokenResponse) {
  if (typeof window === "undefined") return;

  sessionStorage.setItem(ACCESS_KEY, tokens.access);
  sessionStorage.setItem(REFRESH_KEY, tokens.refresh);
}

export function getAccessToken() {
  if (typeof window === "undefined") return null;

  return sessionStorage.getItem(ACCESS_KEY);
}

function getRefreshToken() {
  if (typeof window === "undefined") return null;

  return sessionStorage.getItem(REFRESH_KEY);
}

export function clearTokens() {
  if (typeof window === "undefined") return;

  sessionStorage.removeItem(ACCESS_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
}

function expireSession(message: string): never {
  clearTokens();

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("rahati-session-expired"));
  }

  throw new Error(message);
}

function getErrorMessage(data: any): string {
  if (!data) {
    return "Something went wrong. Please try again.";
  }

  if (typeof data.detail === "string") return data.detail;
  if (typeof data.message === "string") return data.message;

  if (Array.isArray(data.non_field_errors)) {
    return data.non_field_errors.join(" ");
  }

  const messages = Object.entries(data).flatMap(([field, errors]) => {
    const errorList = Array.isArray(errors) ? errors : [errors];

    return errorList
      .filter((error) => typeof error === "string")
      .map((error) => `${field.replaceAll("_", " ")}: ${error}`);
  });

  return messages.length
    ? messages.join("\n")
    : "Something went wrong. Please try again.";
}

async function readResponse(response: Response) {
  if (response.status === 204) {
    return undefined;
  }

  const text = await response.text();

  if (!text) {
    if (!response.ok) {
      throw new Error(`Request failed (${response.status}).`);
    }

    return undefined;
  }

  let data: any;

  try {
    data = JSON.parse(text);
  } catch {
    if (!response.ok) {
      throw new Error(text || `Request failed (${response.status}).`);
    }

    return text;
  }

  if (!response.ok) {
    throw new Error(getErrorMessage(data));
  }

  return data;
}

/* Login */

export async function login(credentials: LoginCredentials) {
  const response = await fetch(`${getApiUrl()}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  });

  const data = (await readResponse(response)) as TokenResponse;

  if (!data?.access || !data?.refresh) {
    throw new Error("The backend did not return valid authentication tokens.");
  }

  saveTokens(data);

  return data;
}

/* Professional registration */

export async function registerProfessional(
  registration: ProfessionalRegistrationData,
): Promise<RegistrationResponse> {
  const formData = new FormData();

  formData.append("nickname", registration.nickname.trim());
  formData.append("password", registration.password);
  formData.append("language", registration.language);

  if (registration.email.trim()) {
    formData.append("email", registration.email.trim());
  }

  if (registration.phone.trim()) {
    formData.append("phone", registration.phone.trim());
  }

  formData.append("display_name", registration.display_name.trim());
  formData.append("bio", registration.bio.trim());
  formData.append("city", registration.city.trim());
  formData.append("address", registration.address.trim());
  formData.append("credential_kind", registration.credential_kind);
  formData.append("credential_file", registration.credential_file);
  formData.append("terms_accepted", String(registration.terms_accepted));

  const response = await fetch(
    `${getApiUrl()}/api/auth/register-professional`,
    {
      method: "POST",
      body: formData,
    },
  );

  return (await readResponse(response)) as RegistrationResponse;
}

/* Refresh access token */

export function refreshAccessToken(): Promise<string> {
  if (refreshPromise) {
    return refreshPromise;
  }

  const request = (async () => {
    const refresh = getRefreshToken();

    if (!refresh) {
      return expireSession("Your session has expired. Please sign in again.");
    }

    let response: Response;

    try {
      response = await fetch(`${getApiUrl()}/api/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh }),
      });
    } catch {
      throw new Error(
        "Unable to connect to Rahati. Please check your connection and try again.",
      );
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      if (response.status === 400 || response.status === 401) {
        return expireSession("Your session has expired. Please sign in again.");
      }

      throw new Error(getErrorMessage(data));
    }

    if (!data?.access) {
      return expireSession(
        "Unable to refresh your session. Please sign in again.",
      );
    }

    sessionStorage.setItem(ACCESS_KEY, data.access);

    if (data.refresh) {
      sessionStorage.setItem(REFRESH_KEY, data.refresh);
    }

    return data.access as string;
  })();

  refreshPromise = request;

  request.then(
    () => {
      if (refreshPromise === request) refreshPromise = null;
    },
    () => {
      if (refreshPromise === request) refreshPromise = null;
    },
  );

  return request;
}

/* Authenticated API requests */

export async function authenticatedFetch(
  path: string,
  options: RequestInit = {},
) {
  let access = getAccessToken();

  if (!access) {
    access = await refreshAccessToken();
  }

  const makeRequest = (token: string) => {
    const headers = new Headers(options.headers);
    headers.set("Authorization", `Bearer ${token}`);

    return fetch(`${getApiUrl()}${path}`, {
      ...options,
      headers,
    });
  };

  let response = await makeRequest(access);

  // A 401 means the access token is no longer valid.
  // A 403 is a permission restriction and must not trigger a refresh.
  if (response.status === 401) {
    access = await refreshAccessToken();
    response = await makeRequest(access);
  }

  return readResponse(response);
}

/* Current authenticated account */

export async function getCurrentUser(): Promise<AuthUser> {
  return authenticatedFetch("/api/me");
}

/* Professional profile */

export async function getProfessionalProfile(): Promise<ProfessionalProfile> {
  return authenticatedFetch("/api/pro/profile");
}

/* Logout */

export function logout() {
  clearTokens();
}
