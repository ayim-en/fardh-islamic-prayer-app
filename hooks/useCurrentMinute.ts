import { useSyncExternalStore } from "react";

const MINUTE_MS = 60 * 1000;
// Land just after the minute rolls over rather than exactly on it, so the
// snapshot never reads the tail end of the minute that just ended.
const TICK_GUARD_MS = 250;

// One timer serves every subscriber. The prayer carousel mounts a last-third
// label per day in the window, and each of them needs the same current minute;
// an interval each would be dozens of timers for a single shared value.
let snapshot = new Date();
let timeout: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

const scheduleTick = () => {
  timeout = setTimeout(
    () => {
      snapshot = new Date();
      listeners.forEach((listener) => listener());
      scheduleTick();
    },
    MINUTE_MS - (Date.now() % MINUTE_MS) + TICK_GUARD_MS
  );
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  if (!timeout) {
    // The timer has been idle, so the stored snapshot is stale by an unknown
    // amount; refresh it before the first render reads it.
    snapshot = new Date();
    scheduleTick();
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };
};

const getSnapshot = () => snapshot;

// The current time, re-read once a minute. The returned Date is stable between
// ticks, so a component reading it only re-renders when the minute changes.
export const useCurrentMinute = (): Date =>
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
