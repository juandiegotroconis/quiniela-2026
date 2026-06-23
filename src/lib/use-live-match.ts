import { useEffect, useState } from "react";
import { getClient } from "./client";
import { rowToMatch } from "./queries";
import type { Match } from "./types";
import type { Tables } from "./supabase";

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
 * Subscribes to Supabase Realtime UPDATE events for a single match row while it
 * is live (or about to kick off) and returns the freshest `Match`. Falls back to
 * the seed `match` for finished / far-future matches without opening a channel.
 */
export function useLiveMatch(match: Match): Match {
  const [liveMatch, setLiveMatch] = useState<Match>(match);

  // Re-seed when the upstream match prop changes (e.g. DataProvider refetch or
  // navigating to a different match id).
  useEffect(() => {
    setLiveMatch(match);
  }, [match]);

  useEffect(() => {
    if (!shouldSubscribe(match)) return;

    const client = getClient();
    const channel = client
      .channel(`match-${match.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "matches",
          filter: `id=eq.${match.id}`,
        },
        (payload) => {
          setLiveMatch(rowToMatch(payload.new as Tables<"matches">));
        },
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
    // Re-subscribe when the match id changes, or when status flips into a
    // subscribe-worthy state (upcoming -> live) so a match opened early connects.
  }, [match.id, match.status]);

  return liveMatch;
}
