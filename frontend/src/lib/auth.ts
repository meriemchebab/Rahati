const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

const ACCESS_KEY = "rahati_access";
const REFRESH_KEY = "rahati_refresh";

export interface LoginCredentials {
  username: string;
  password: string;
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

function getApiUrl() {
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured.");
  }

  return API_URL;
}

export function saveTokens(tokens: TokenResponse) {
  sessionStorage.setItem(ACCESS_KEY, tokens.access);
  sessionStorage.setItem(REFRESH_KEY, tokens.refresh);
}

export function getAccessToken() {
  return sessionStorage.getItem(ACCESS_KEY);
}

function getRefreshToken() {
  return sessionStorage.getItem(REFRESH_KEY);
}

export function clearTokens() {
  sessionStorage.removeItem(ACCESS_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
}

async function readResponse(response: Response) {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data?.detail ||
      data?.message ||
      data?.non_field_errors?.[0] ||
      "Something went wrong. Please try again.";

    throw new Error(message);
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

  if (!data.access || !data.refresh) {
    throw new Error("The backend did not return valid authentication tokens.");
  }

  saveTokens(data);

  return data;
}

/* Refresh access token */

export async function refreshAccessToken(): Promise<string> {
  const refresh = getRefreshToken();

  if (!refresh) {
    clearTokens();
    throw new Error("Your session has expired. Please sign in again.");
  }

  const response = await fetch(`${getApiUrl()}/api/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh }),
  });

  const data = await readResponse(response);

  if (!data.access) {
    clearTokens();
    throw new Error("Unable to refresh your session.");
  }

  sessionStorage.setItem(ACCESS_KEY, data.access);

  if (data.refresh) {
    sessionStorage.setItem(REFRESH_KEY, data.refresh);
  }

  return data.access;
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
