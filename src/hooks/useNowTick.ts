import { useSyncExternalStore } from "react";

// A single shared clock for all subscribers. Components that need to
// re-render purely because wall-clock time advanced (e.g. to re-evaluate
// whether live match data has gone stale) subscribe here instead of each
// owning a setInterval — one timer total no matter how many MatchCards are
// mounted, which matters when hundreds of cards render during a match day.

const INTERVAL_MS = 30 * 1000;

let now = Date.now();
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (timer === null) {
    timer = setInterval(() => {
      now = Date.now();
      listeners.forEach((l) => l());
    }, INTERVAL_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };
}

function getSnapshot(): number {
  return now;
}

const noopSubscribe = () => () => {};
const getZero = () => 0;

// Returns a timestamp (ms) that advances every 30s, triggering a re-render.
// Pass `enabled = false` to opt out (returns a constant, never subscribes) so
// components that don't currently need the tick — e.g. non-live match cards —
// don't re-render on every interval.
export function useNowTick(enabled: boolean = true): number {
  return useSyncExternalStore(
    enabled ? subscribe : noopSubscribe,
    enabled ? getSnapshot : getZero,
  );
}
