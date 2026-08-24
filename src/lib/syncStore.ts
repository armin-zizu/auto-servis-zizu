'use client';

import { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabase } from './supabaseClient';

/**
 * Central sync store.
 *
 * Strategy:
 *  - `localStorage` is the fast, offline-readable cache.
 *  - Supabase table `app_data` is the shared source of truth across devices.
 *  - On read: return cached value immediately, then fetch the latest from
 *    Supabase and update the cache + notify subscribers.
 *  - On write: write to localStorage immediately (optimistic), then push to
 *    Supabase. On failure, keep the local value (offline-first).
 *  - Real-time subscription pushes changes made on other devices/tabs.
 */

export const SYNC_EVENT = 'autoservis-sync-changed';

type Subscriber = () => void;

const listeners = new Map<string, Set<Subscriber>>();
const channels = new Map<string, RealtimeChannel>();
const tableName = 'app_data';

// A project can be deployed before its SQL migration has been run. In that
// case PostgREST responds with 404/PGRST205 for every sync request. Keep the
// app usable from localStorage and avoid repeatedly issuing failing requests.
let appDataAvailable = true;

function isMissingTableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const details = error as { code?: string; status?: number };
  return details.status === 404 || details.code === 'PGRST205' || details.code === '42P01';
}

function markTableUnavailable(error: unknown) {
  if (isMissingTableError(error)) appDataAvailable = false;
}

function notify(key: string) {
  const set = listeners.get(key);
  if (set) set.forEach((cb) => cb());
  window.dispatchEvent(new Event(SYNC_EVENT));
}

/** Local cache read (synchronous, no network). */
export function readCache<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Local cache write (synchronous). */
export function writeCache(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    // The browser `storage` event does not fire in the same tab that made the
    // change. Broadcast our app event so dashboard widgets refresh instantly.
    window.dispatchEvent(new Event(SYNC_EVENT));
  } catch {
    /* storage full / unavailable */
  }
}

/** Fetch the latest value for a key from Supabase and update the cache. */
export async function pull<T>(key: string): Promise<T | null> {
  return pullInternal<T>(key);
}

async function pullInternal<T>(key: string): Promise<T | null> {
  const supabase = getSupabase();
  if (!supabase || !appDataAvailable) return null;
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('value')
      .eq('key', key)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const parsed = data.value as T;
    // Only write cache + notify when the value actually changed.
    // Notifying unconditionally causes an infinite pull -> push -> realtime ->
    // pull loop ("Maximum update depth exceeded") because pushes are echoed
    // back to the same client via the realtime subscription.
    const current = readCache<T>(key, parsed);
    if (JSON.stringify(current) !== JSON.stringify(parsed)) {
      writeCache(key, parsed);
      notify(key);
    }
    return parsed;
  } catch (error) {
    markTableUnavailable(error);
    return null;
  }
}

/** Push a value to Supabase (upsert). Returns true on success. */
export async function push<T>(key: string, value: T): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase || !appDataAvailable) return false;
  try {
    const { error } = await supabase.from(tableName).upsert(
      { key, value, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );
    if (error) throw error;
    return true;
  } catch (error) {
    markTableUnavailable(error);
    return false;
  }
}

/**
 * Full sync round-trip: read latest from server, then write local value to
 * server if the local value differs (last-write-wins). Returns the resolved
 * value.
 */
export async function sync<T>(key: string, localValue: T): Promise<T> {
  const supabase = getSupabase();
  if (!supabase) return localValue;

  try {
    const remote = await pull<T>(key);
    // If no remote value, seed it with the local one.
    if (remote === null) {
      await push(key, localValue);
      return localValue;
    }
    // Simplified last-write-wins: if they differ, push the local value.
    // (A timestamp-based conflict resolution could be added later.)
    if (JSON.stringify(remote) !== JSON.stringify(localValue)) {
      await push(key, localValue);
    }
    return localValue;
  } catch {
    return localValue;
  }
}

/**
 * Subscribe to changes for a key (from other tabs/devices via realtime).
 * Returns an unsubscribe function.
 */
export function subscribe<T>(key: string, listener: Subscriber): () => void {
  const supabase = getSupabase();
  if (!listeners.has(key)) listeners.set(key, new Set());
  const keyListeners = listeners.get(key)!;
  keyListeners.add(listener);

  // Multiple components can watch the same key. A single channel per key is
  // important: Realtime channels cannot have postgres callbacks added once
  // they have already been subscribed.
  if (supabase && appDataAvailable && !channels.has(key)) {
    const channel = supabase.channel(`app_data_${key}`).on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tableName, filter: `key=eq.${key}` },
        () => {
          void pull<T>(key);
        }
      );
    channels.set(key, channel);
    channel.subscribe();
  }

  return () => {
    keyListeners.delete(listener);
    if (keyListeners.size > 0) return;

    listeners.delete(key);
    const channel = channels.get(key);
    channels.delete(key);
    if (supabase && channel) void supabase.removeChannel(channel);
  };
}

/** Easy hook-style helper: read + pull + subscribe in one call. */
export function attachSync<T>(
  key: string,
  fallback: T,
  onValue: (value: T) => void
): () => void {
  // Initial local value
  const cached = readCache<T>(key, fallback);
  onValue(cached);

  // Pull latest from server
  void pull<T>(key).then((remote) => {
    if (remote !== null) onValue(remote);
  });

  // Subscribe to remote/tab changes
  return subscribe(key, () => {
    const current = readCache<T>(key, fallback);
    onValue(current);
  });
}
