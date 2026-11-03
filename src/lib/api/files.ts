"use client";

// Uploaded files (photos, invoice PDFs) need the bearer token, so an <img src>
// can't point at the API. Each id is fetched once, turned into an object URL,
// shared by every component showing it (thumbnail, detail, lightbox) and
// revoked when the last one unmounts.

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";

export type LoadedFile = { url: string; type: string };

type Entry = { users: number; promise: Promise<LoadedFile>; file?: LoadedFile };
const cache = new Map<string, Entry>();

function acquire(id: string): Entry {
  let entry = cache.get(id);
  if (!entry) {
    const created: Entry = {
      users: 0,
      promise: api.blob(`/files/${encodeURIComponent(id)}`).then((blob) => {
        const file = { url: URL.createObjectURL(blob), type: blob.type };
        created.file = file;
        // Everyone left while it was loading: nothing will release it later.
        if (created.users === 0 && cache.get(id) !== created) URL.revokeObjectURL(file.url);
        return file;
      }),
    };
    // A failed download is not cached, so the next mount retries.
    created.promise.catch(() => cache.get(id) === created && cache.delete(id));
    cache.set(id, created);
    entry = created;
  }
  entry.users += 1;
  return entry;
}

function release(id: string, entry: Entry) {
  entry.users -= 1;
  if (entry.users > 0) return;
  // A short grace period: a thumbnail unmounting as the lightbox mounts keeps the same URL.
  setTimeout(() => {
    if (entry.users > 0 || cache.get(id) !== entry) return;
    cache.delete(id);
    if (entry.file) URL.revokeObjectURL(entry.file.url);
  }, 1000);
}

export const isPdf = (f: LoadedFile | undefined) => f?.type === "application/pdf";

/** A file's object URL and type, or the error that stopped it loading. */
export function useFile(id: string): { file?: LoadedFile; error: unknown; loading: boolean } {
  const [state, setState] = useState<{ id: string; file?: LoadedFile; error: unknown }>({ id, error: null });

  useEffect(() => {
    let live = true;
    const entry = acquire(id);
    entry.promise.then(
      (file) => live && setState({ id, file, error: null }),
      (error) => live && setState({ id, error }),
    );
    return () => {
      live = false;
      release(id, entry);
    };
  }, [id]);

  // Ignore a result left over from the previous id while the new one loads.
  const mine = state.id === id ? state : { error: null, file: undefined };
  return { file: mine.file, error: mine.error, loading: !mine.file && !mine.error };
}
