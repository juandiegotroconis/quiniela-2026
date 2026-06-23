import { getClient } from "./client";
import type { Database, Tables } from "./supabase";
import type {
  Match,
  MatchCorrection,
  MatchStatus,
  Member,
  TopScorer,
  TopScorerPick,
} from "./types";
import type { UserPickEntry } from "./auth-context";
import type { TopScorerSuggestion } from "./mock-data";

export const DEFAULT_QUINIELA_ID = "8c3e9b93-e0bc-4665-b3d0-a5ca3c365d83";

function dbStatusToUi(s: string): MatchStatus {
  if (s === "FINISHED") return "finished";
  if (s === "IN_PLAY" || s === "PAUSED") return "live";
  return "upcoming";
}

export function rowToMatch(row: Tables<"matches">): Match {
  return {
    id: row.id,
    group: row.group_name ?? "",
    day: row.matchday ?? 0,
    teamA: row.home_team_code ?? "",
    teamB: row.away_team_code ?? "",
    scoreA: row.score_home_regular,
    scoreB: row.score_away_regular,
    status: dbStatusToUi(row.status),
    utcDate: row.utc_date ?? "",
    stage: row.stage,
    scoreAEt: row.score_home_et,
    scoreBEt: row.score_away_et,
    winner: row.winner,
    minute: row.minute,
    venue: row.venue,
    venueCity: row.venue_city,
    venueCountry: row.venue_country,
  };
}

export async function fetchMatches(): Promise<Match[]> {
  const client = getClient();
  const { data, error } = await client
    .from("matches")
    .select(
      "id, group_name, matchday, home_team_code, away_team_code, utc_date, status, score_home_regular, score_away_regular, stage, score_home_et, score_away_et, winner, minute, venue, venue_city, venue_country",
    )
    .order("utc_date", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) =>
    rowToMatch(row as unknown as Tables<"matches">),
  );
}

const CORRECTION_ALERT_WINDOW_MS = 12 * 60 * 60 * 1000;

export async function fetchRecentMatchCorrections(): Promise<
  MatchCorrection[]
> {
  const cutoff = new Date(Date.now() - CORRECTION_ALERT_WINDOW_MS).toISOString();
  const client = getClient();
  const { data, error } = await client
    .from("match_corrections")
    .select(
      "id, match_id, old_score_home, old_score_away, new_score_home, new_score_away, corrected_at, matches(home_team_code, away_team_code)",
    )
    .gte("corrected_at", cutoff)
    .order("corrected_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    matchId: row.match_id,
    teamA: row.matches?.home_team_code ?? "",
    teamB: row.matches?.away_team_code ?? "",
    oldScoreA: row.old_score_home,
    oldScoreB: row.old_score_away,
    newScoreA: row.new_score_home,
    newScoreB: row.new_score_away,
    correctedAt: row.corrected_at,
  }));
}

export async function fetchQuinielaName(
  quinielaId: string,
): Promise<string | null> {
  const client = getClient();
  const { data, error } = await client
    .from("quinielas")
    .select("name")
    .eq("id", quinielaId)
    .maybeSingle();
  if (error) throw error;
  return data?.name ?? null;
}

export async function fetchMembersCore(quinielaId: string): Promise<Member[]> {
  const client = getClient();
  const { data, error } = await client
    .from("quiniela_members")
    .select(
      "user_id, display_name, avatar_color, total_pts, rank, prev_rank, rank_change, exact_count, correct_count, scored_matches, best_streak, worst_streak, current_streak, joined_at",
    )
    .eq("quiniela_id", quinielaId)
    .order("rank", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []).map(
    (row): Member => ({
      userId: row.user_id ?? "",
      displayName: row.display_name,
      avatarColor: row.avatar_color,
      pts: row.total_pts,
      rank: row.rank ?? 0,
      prevRank: row.prev_rank,
      rankChange: row.rank_change,
      exactCount: row.exact_count,
      correctCount: row.correct_count,
      scoredMatches: row.scored_matches,
      bestStreak: row.best_streak,
      worstStreak: row.worst_streak,
      currentStreak: row.current_streak,
      history: [],
      joinedAt: row.joined_at,
    }),
  );
}

export async function fetchMemberHistory(
  quinielaId: string,
): Promise<Record<string, number[]>> {
  const { data } = await getClient()
    .from("leaderboard_snapshots")
    .select("user_id, rank_at_moment")
    .eq("quiniela_id", quinielaId)
    .order("created_at", { ascending: true });
  const map: Record<string, number[]> = {};
  for (const snap of data ?? []) {
    if (!map[snap.user_id]) map[snap.user_id] = [];
    map[snap.user_id].push(snap.rank_at_moment);
  }
  return map;
}

export async function fetchSingleMemberHistory(
  userId: string,
  quinielaId: string,
): Promise<number[]> {
  const { data } = await getClient()
    .from("leaderboard_snapshots")
    .select("rank_at_moment")
    .eq("quiniela_id", quinielaId)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  return (data ?? []).map((r) => r.rank_at_moment);
}

export async function fetchUserPicks(
  userId: string,
  quinielaId: string,
): Promise<Record<number, UserPickEntry>> {
  const client = getClient();
  const { data, error } = await client
    .from("predictions")
    .select("match_id, pick_home, pick_away")
    .eq("user_id", userId)
    .eq("quiniela_id", quinielaId);
  if (error) throw error;
  const picks: Record<number, UserPickEntry> = {};
  for (const row of data ?? []) {
    picks[row.match_id] = {
      pickA: String(row.pick_home),
      pickB: String(row.pick_away),
    };
  }
  return picks;
}

export async function fetchUserTopScorer(
  userId: string,
  quinielaId: string,
): Promise<TopScorerSuggestion | null> {
  const client = getClient();
  const { data } = await client
    .from("top_scorer_predictions")
    .select("player_name, player_team")
    .eq("user_id", userId)
    .eq("quiniela_id", quinielaId)
    .maybeSingle();
  if (!data) return null;
  return { name: data.player_name, team: data.player_team ?? "" };
}

export async function fetchTopScorers(): Promise<TopScorer[]> {
  const client = getClient();
  const { data, error } = await client
    .from("top_scorers")
    .select(
      "fifa_person_id, rank, name, name_es, team_code, goals, assists, minutes_played, image_url",
    )
    .order("rank", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    fifaPersonId: row.fifa_person_id,
    rank: row.rank,
    name: row.name,
    nameEs: row.name_es,
    teamCode: row.team_code,
    goals: row.goals,
    assists: row.assists,
    minutesPlayed: row.minutes_played,
    imageUrl: row.image_url,
  }));
}

export async function fetchTopScorerPicks(
  quinielaId: string,
): Promise<TopScorerPick[]> {
  const client = getClient();
  const { data, error } = await client
    .from("top_scorer_predictions")
    .select("user_id, player_name, player_team")
    .eq("quiniela_id", quinielaId);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    userId: row.user_id,
    playerName: row.player_name,
    playerTeam: row.player_team ?? "",
  }));
}

export async function checkSubmitted(
  userId: string,
  quinielaId: string,
): Promise<boolean> {
  const client = getClient();
  const { data } = await client
    .from("prediction_submissions")
    .select("user_id")
    .eq("user_id", userId)
    .eq("quiniela_id", quinielaId)
    .maybeSingle();
  return !!data;
}

export async function fetchMatchPredictions(
  matchId: number,
  quinielaId: string,
): Promise<Array<{ userId: string; pickA: number; pickB: number; pickPenaltiesWinner: string | null }>> {
  const client = getClient();
  const { data, error } = await client
    .from("predictions")
    .select("user_id, pick_home, pick_away, pick_penalties_winner")
    .eq("match_id", matchId)
    .eq("quiniela_id", quinielaId);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    userId: row.user_id,
    pickA: row.pick_home,
    pickB: row.pick_away,
    pickPenaltiesWinner: row.pick_penalties_winner,
  }));
}

export interface MembershipInfo {
  quinielaId: string;
  avatarColor: string | null;
  isUpdatable: boolean;
  variant: string | null;
}

export async function fetchUserMembershipInfo(
  userId: string,
): Promise<MembershipInfo | null> {
  const { data } = await getClient()
    .from("quiniela_members")
    .select("quiniela_id, avatar_color, quinielas(is_updatable, variant)")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const row = data;
  return {
    quinielaId: row.quiniela_id ?? "",
    avatarColor: row.avatar_color ?? null,
    isUpdatable: row.quinielas?.is_updatable ?? true,
    variant: row.quinielas?.variant ?? null,
  };
}

export async function savePredictions(
  userId: string,
  quinielaId: string,
  picks: Record<number, UserPickEntry>,
  topScorer: TopScorerSuggestion | null,
): Promise<void> {
  const client = getClient();
  const filledRows = Object.entries(picks)
    .filter(([, pick]) => pick.pickA !== "" && pick.pickB !== "")
    .map(([matchId, pick]) => ({
      quiniela_id: quinielaId,
      user_id: userId,
      match_id: Number(matchId),
      pick_home: Number(pick.pickA),
      pick_away: Number(pick.pickB),
    }));

  if (filledRows.length > 0) {
    const { error } = await client.from("predictions").upsert(filledRows, {
      onConflict: "user_id,quiniela_id,match_id",
    });
    if (error) throw error;
  }

  if (topScorer) {
    const { error } = await client.from("top_scorer_predictions").upsert(
      {
        quiniela_id: quinielaId,
        user_id: userId,
        player_name: topScorer.name,
        player_team: topScorer.team,
      },
      { onConflict: "user_id,quiniela_id" },
    );
    if (error) throw error;
  }
}

export async function updateAvatarColor(
  userId: string,
  quinielaId: string,
  color: string,
): Promise<void> {
  const client = getClient();
  const [profileRes, memberRes] = await Promise.all([
    client.from("profiles").update({ avatar_color: color }).eq("id", userId),
    client
      .from("quiniela_members")
      .update({ avatar_color: color })
      .eq("user_id", userId)
      .eq("quiniela_id", quinielaId),
  ]);
  if (profileRes.error) throw profileRes.error;
  if (memberRes.error) throw memberRes.error;
}

export interface PlayerResult {
  id: number;
  name: string;
  team_code: string;
  position: string | null;
}

type PlayerResults =
  Database["public"]["Functions"]["search_players_detailed"]["Returns"];

export async function searchPlayers(query: string): Promise<PlayerResults> {
  if (!query.trim()) return [];
  const { data, error } = await getClient()
    .rpc("search_players_detailed", {
      q: query,
    })
    .select("*");
  if (error) throw error;
  return data ?? [];
}

export async function submitAllPredictions(
  userId: string,
  quinielaId: string,
  picks: Record<number, UserPickEntry>,
  topScorer: TopScorerSuggestion,
): Promise<void> {
  const client = getClient();
  const predRows = Object.entries(picks).map(([matchId, pick]) => ({
    quiniela_id: quinielaId,
    user_id: userId,
    match_id: Number(matchId),
    pick_home: Number(pick.pickA),
    pick_away: Number(pick.pickB),
  }));

  const [predRes, tsRes, subRes] = await Promise.all([
    client.from("predictions").upsert(predRows, {
      onConflict: "user_id,quiniela_id,match_id",
    }),
    client.from("top_scorer_predictions").upsert(
      {
        quiniela_id: quinielaId,
        user_id: userId,
        player_name: topScorer.name,
        player_team: topScorer.team,
      },
      { onConflict: "user_id,quiniela_id" },
    ),
    client
      .from("prediction_submissions")
      .upsert(
        { quiniela_id: quinielaId, user_id: userId },
        { onConflict: "user_id,quiniela_id" },
      ),
  ]);
  if (predRes.error) throw predRes.error;
  if (tsRes.error) throw tsRes.error;
  if (subRes.error) throw subRes.error;
}
