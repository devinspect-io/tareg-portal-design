"use client";

// The signed-in office user. One small external store so the login form, the
// dashboard guard, the top bar and every permission check read the same thing.
//
// The JWT lives 12 hours and there is no refresh token: when it runs out the
// next call 401s, the client calls back here, and the user lands on /login.

import { useSyncExternalStore } from "react";
import { ApiError, api, getToken, setToken, setUnauthorizedHandler } from "@/lib/api/client";
import type { Permission, Session } from "@/lib/api/types";

export type SessionState =
  | { status: "unknown" }
  | { status: "signedOut"; expired?: boolean }
  | { status: "signedIn"; session: Session };

let state: SessionState = { status: "unknown" };
const listeners = new Set<() => void>();

function set(next: SessionState) {
  state = next;
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

setUnauthorizedHandler(() => {
  setToken(null);
  set({ status: "signedOut", expired: true });
});

/** Driver-app accounts are refused here: they belong in the mobile app. */
export class DriverAccountError extends Error {
  constructor() {
    super("Driver accounts sign in through the mobile app");
    this.name = "DriverAccountError";
  }
}

export async function signIn(login: string, password: string) {
  const res = await api.post<Session & { token: string }>("/auth/login", { login: login.trim(), password });
  if (res.role.audience !== "office") throw new DriverAccountError();
  setToken(res.token);
  const { token: _token, ...session } = res;
  void _token;
  set({ status: "signedIn", session });
  return session;
}

/** Restores the session from the stored token (once per page load). */
let restoring: Promise<void> | null = null;
export function restoreSession() {
  if (state.status !== "unknown") return Promise.resolve();
  if (!getToken()) {
    set({ status: "signedOut" });
    return Promise.resolve();
  }
  restoring ??= api
    .get<Session>("/auth/me")
    .then((session) => {
      if (session.role.audience !== "office") throw new DriverAccountError();
      set({ status: "signedIn", session });
    })
    .catch((e) => {
      // Offline or server down: keep the token, but there is nothing to show.
      if (!(e instanceof ApiError && e.status === 0)) setToken(null);
      set({ status: "signedOut", expired: e instanceof ApiError && e.status === 401 });
    })
    .finally(() => {
      restoring = null;
    });
  return restoring;
}

export function signOut() {
  // The backend has no logout endpoint: dropping the token is the sign-out.
  setToken(null);
  set({ status: "signedOut" });
}

export function useSession(): SessionState {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

/** `can("vehicles:manage")`. Always false while signed out. */
export function useCan() {
  const s = useSession();
  const perms = s.status === "signedIn" ? s.session.permissions : [];
  return (p: Permission) => perms.includes(p);
}

/**
 * Whether the signed-in role may open a portal module. Every module key is a
 * permission module (`vehicles` -> `vehicles:view`); Users & Roles opens for
 * either half, and AI Reporting rides on reports.
 */
export function useCanOpen() {
  const can = useCan();
  return (key: string) => {
    if (key === "users") return can("users:view") || can("roles:view");
    if (key === "ai-reporting") return can("reports:view");
    return can(`${key}:view`);
  };
}
