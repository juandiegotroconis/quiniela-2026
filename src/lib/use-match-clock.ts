import { useEffect, useRef, useState } from "react";
import type { Match } from "./types";

// FIFA's API only reports the match clock at minute granularity (e.g. "90+3"),
// refreshed about once a minute. To make the live timer feel alive we simulate
// the seconds locally: every time the reported minute changes we anchor a
// wall-clock timestamp and count up from 0, clamped to 59 so we never spill
// into the next minute before the real value catches up. It's cosmetic — the
// seconds are not real data, just a smooth fill between server updates.

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/**
 * Returns the live clock with simulated seconds (e.g. "45:07", "90+3:12") while
 * the match is live and playing, or null otherwise (not live, no minute, or
 * half-time — the caller renders "HT" itself).
 */
export function useLiveClock(match: Match): string | null {
  const minute = match.status === "live" ? match.minute : null;
  const playing = !!minute && !match.isHalftime;

  const anchorRef = useRef<number>(Date.now());
  const [seconds, setSeconds] = useState(0);

  // Re-anchor whenever the reported minute changes (a fresh server update).
  useEffect(() => {
    anchorRef.current = Date.now();
    setSeconds(0);
  }, [minute]);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      const elapsed = Math.floor((Date.now() - anchorRef.current) / 1000);
      setSeconds(Math.min(59, Math.max(0, elapsed)));
    }, 1000);
    return () => clearInterval(id);
  }, [playing]);

  if (!playing) return null;
  return `${minute}:${pad(seconds)}`;
}
