"use client";

// Thin fetch wrapper for the Tareg backend.
//
// Every success is `{ data }` (lists add `meta: { total, page, pageSize }`),
// every failure is `{ error: { code, message, details } }`. This file is the
// only place that knows that shape: callers get plain data back or an ApiError.
//
// The host comes ONLY from NEXT_PUBLIC_API_BASE_URL (.env.local, gitignored).

import type { Paged } from "@/lib/api/types";

const BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/+$/, "");
const TOKEN_KEY = "tareg.token";

export const apiConfigured = BASE.length > 0;

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ---------- Token ----------

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Private mode or blocked storage: the session just won't survive a reload.
  }
}

// A 401 on a signed-in call means the 12h token ran out (there is no refresh
// token). The session store registers this to sign out and send the user to
// the login page.
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

// ---------- Requests ----------

type Query = Record<string, string | number | boolean | null | undefined>;

function buildUrl(path: string, query?: Query) {
  const url = new URL(`${BASE}/api/v1${path}`);
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  return url.toString();
}

async function request<T>(method: string, path: string, opts: { query?: Query; body?: unknown; raw?: boolean } = {}): Promise<T> {
  if (!apiConfigured) throw new ApiError(0, "NOT_CONFIGURED", "NEXT_PUBLIC_API_BASE_URL is not set");

  const token = getToken();
  let res: Response;
  try {
    res = await fetch(buildUrl(path, opts.query), {
      method,
      headers: {
        Accept: "application/json",
        ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError(0, "NETWORK", "Could not reach the server");
  }

  const json = res.status === 204 ? null : await res.json().catch(() => null);

  if (!res.ok) {
    const err = json?.error ?? {};
    if (res.status === 401 && token && path !== "/auth/login") onUnauthorized?.();
    throw new ApiError(res.status, err.code ?? `HTTP_${res.status}`, err.message ?? res.statusText, err.details);
  }

  if (opts.raw) return json as T;
  return (json?.data ?? null) as T;
}

export const api = {
  get: <T>(path: string, query?: Query) => request<T>("GET", path, { query }),
  /** A paged list: `{ items, total, page, pageSize }`. */
  page: async <T>(path: string, query?: Query): Promise<Paged<T>> => {
    const json = await request<{ data: T[]; meta?: { total: number; page: number; pageSize: number } }>("GET", path, { query, raw: true });
    const items = json?.data ?? [];
    return {
      items,
      total: json?.meta?.total ?? items.length,
      page: json?.meta?.page ?? 1,
      pageSize: json?.meta?.pageSize ?? items.length,
    };
  },
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, { body: body ?? {} }),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, { body }),
  delete: <T = null>(path: string) => request<T>("DELETE", path),
};
