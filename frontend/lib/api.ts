// frontend/lib/api.ts
// Axios instance pre-configured with base URL and auth interceptors.
// All API calls in the app must go through these helpers.

import axios, { type AxiosRequestConfig } from "axios";
import { getCurrentUserToken } from "./firebase";

const BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export const axiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// ── Request interceptor: attach Firebase ID token ─────────────────────────
axiosInstance.interceptors.request.use(
  async (config) => {
    const token = await getCurrentUserToken();
    if (token) {
      config.headers = config.headers ?? {};
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: handle 401 ─────────────────────────────────────
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Import is deferred to avoid circular deps at module load time
      import("./firebase").then(({ signOut }) => signOut());
      // Redirect to login — works in both App Router and client components
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// ── Typed helper functions ────────────────────────────────────────────────

export async function get<T>(
  url: string,
  params?: Record<string, unknown>
): Promise<T> {
  const config: AxiosRequestConfig = params ? { params } : {};
  const res = await axiosInstance.get<T>(url, config);
  return res.data;
}

export async function post<T>(
  url: string,
  body?: unknown
): Promise<T> {
  const res = await axiosInstance.post<T>(url, body);
  return res.data;
}

export async function patch<T>(
  url: string,
  body?: unknown
): Promise<T> {
  const res = await axiosInstance.patch<T>(url, body);
  return res.data;
}

export async function put<T>(
  url: string,
  body?: unknown
): Promise<T> {
  const res = await axiosInstance.put<T>(url, body);
  return res.data;
}

export async function del<T>(url: string): Promise<T> {
  const res = await axiosInstance.delete<T>(url);
  return res.data;
}
