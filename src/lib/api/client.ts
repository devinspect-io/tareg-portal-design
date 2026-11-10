"use client";

// Thin fetch wrapper for the Tareg backend.
//
// Every success is `{ data }` (lists add `meta: { total, page, pageSize }`),
// every failure is `{ error: { code, message, details } }`. This file is the
// only place that knows that shape: callers get plain data back or an ApiError.
//
// The host comes ONLY from NEXT_PUBLIC_API_BASE_URL (.env.local, gitignored).
// File downloads (/files/*) live in a separate service: NEXT_PUBLIC_FILES_BASE_URL
// (same convention, host without /api/v1). When it is not set they fall back to
// the API host, where a gateway routes /api/v1/files to the files service.

import type { Paged } from "@/lib/api/types";

const BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/+$/, "");
const TOKEN_KEY = "tareg.token";

const FILES_BASE = (process.env.NEXT_PUBLIC_FILES_BASE_URL ?? "").replace(/\/+$/, "") || BASE;

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

function buildUrl(path: string, query?: Query, base: string = BASE) {
  const url = new URL(`${base}/api/v1${path}`);
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

/**
 * Raw bytes of a signed-in download (GET /files/:id), served by the files
 * service (FILES_BASE). The token can't ride on an <img src>, so files are
 * fetched here and shown through an object URL.
 */
async function requestBlob(path: string): Promise<Blob> {
  if (!apiConfigured) throw new ApiError(0, "NOT_CONFIGURED", "NEXT_PUBLIC_API_BASE_URL is not set");
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(buildUrl(path, undefined, FILES_BASE), { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  } catch {
    throw new ApiError(0, "NETWORK", "Could not reach the server");
  }
  if (!res.ok) {
    const err = (await res.json().catch(() => null))?.error ?? {};
    if (res.status === 401 && token) onUnauthorized?.();
    throw new ApiError(res.status, err.code ?? `HTTP_${res.status}`, err.message ?? res.statusText, err.details);
  }
  return res.blob();
}

export const api = {
  blob: requestBlob,
  get: <T>(path: string, query?: Query) => request<T>("GET", path, { query }),
  /** A single object that also carries paging `meta` (GET /history/...): `{ data, total, page, pageSize }`. */
  getWithMeta: async <T>(path: string, query?: Query) => {
    const json = await request<{ data: T; meta?: { total: number; page: number; pageSize: number } }>("GET", path, { query, raw: true });
    return { data: json?.data as T, total: json?.meta?.total ?? 0, page: json?.meta?.page ?? 1, pageSize: json?.meta?.pageSize ?? 0 };
  },
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
