import { useEffect, useRef } from "react";
import { getClient } from "./client";
import { rowToMatch, type MatchRow } from "./queries";
import type { Match } from "./types";

// How early before kickoff we start listening, so the upcoming -> live
// transition is caught without an open channel for far-future matches.
const PREKICKOFF_WINDOW_MS = 5 * 60 * 1000;

function shouldSubscribe(match: Match): boolean {
  if (match.status === "live") return true;
  if (match.status === "upcoming" && match.utcDate) {
    const kickoff = new Date(match.utcDate).getTime();
    if (!Number.isNaN(kickoff)) {
      return Date.now() >= kickoff - PREKICKOFF_WINDOW_MS;
    }
  }
  return false;
}

/**
 * Opens a *single* shared Realtime channel for the whole `matches` table (no
 * per-row filter) and routes every UPDATE through `onUpdate`. Mounted once at
 * the app level (DataProvider), so every screen shares one connection and a
 * live score stays consistent everywhere. The channel is only opened while at
 * least one match is live or within the pre-kickoff window, and torn down when
 * nothing is active — no idle connections on quiet days.
 */
export function useLiveMatches(
  matches: Match[],
  onUpdate: (match: Match) => void,
): void {
  const onUpdateRef = useRef(onUpdate);
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  // Only keep a channel open when something is actually live / about to start.
  const active = matches.some(shouldSubscribe);

  useEffect(() => {
    if (!active) return;

    const client = getClient();
    const channel = client
      .channel("matches-live")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "matches" },
        (payload) => {
          onUpdateRef.current(rowToMatch(payload.new as MatchRow));
        },
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [active]);
}
