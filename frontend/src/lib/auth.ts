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
  const data = await response.json().catch(() => null);

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

  if (!data.access || !data.refresh) {
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
