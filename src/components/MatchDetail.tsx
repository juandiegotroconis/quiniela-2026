import "./MatchDetail.css";
import { useState, useEffect, useRef } from "react";
import { Link } from "react-router";
import { Icon } from "@iconify/react";
import { useTranslation } from "~/hooks/useTranslation";
import RulesModal from "./RulesModal";
import TeamFlag from "./TeamFlag";
import Badge from "./Badge";
import PredictionGroupCard from "./PredictionGroupCard";
import PredictionGroupCardSkeleton from "./PredictionGroupCardSkeleton";
import WhatIfLeaderboard from "./WhatIfLeaderboard";
import BenchSection, { type BenchPlayer } from "./BenchSection";
import MatchEventTimeline from "./MatchEventTimeline";
import {
  groupPredictions,
  getAliveTeams,
  getPickResult,
  getResultVariant,
  getResultPoints,
  getResultLabel,
  formatMatchTime,
  formatMatchDateTime,
  getStageLabelKey,
  getLiveMinute,
  isLiveDataStale,
} from "~/lib/helpers";
import { useNowTick } from "~/hooks/useNowTick";
import type { Match } from "~/lib/types";
import { TEAM_FULL } from "~/lib/mock-data";
import type { UserPickEntry } from "~/lib/auth-context";
import { useAuth } from "~/lib/auth-context";
import { useData } from "~/lib/data-context";
import {
  fetchMatchPredictions,
  fetchMatchEvents,
  fetchMatchBracketPredictions,
  fetchMatchLeaderboardSnapshot,
} from "~/lib/queries";
import type { MatchPrediction, MatchEvent } from "~/lib/types";
import type { PredictionGroup } from "~/lib/helpers";

interface Props {
  match: Match;
  onBack: () => void;
  userPick?: UserPickEntry;
}

function MatchStatusBadge({ match }: { match: Match }) {
  const { t, language } = useTranslation();
  const liveMinute = getLiveMinute(match);
  if (match.status === "live") {
    return (
      <Badge
        variant='error'
        className={!match.isHalftime && liveMinute ? "badge--live-pulse" : undefined}
      >
        {t("MATCH_STATUS_LIVE")}{" "}
        {match.isHalftime
          ? t("MATCH_STATUS_HT")
          : liveMinute ?? formatMatchTime(match.utcDate, language)}
      </Badge>
    );
  }
  if (match.status === "finished")
    return <Badge variant='default'>{t("MATCH_STATUS_FT")}</Badge>;
  return (
    <span className='match-detail__status-time'>
      {formatMatchDateTime(match.utcDate, language)}
    </span>
  );
}

export default function MatchDetail({ match: matchProp, onBack, userPick }: Props) {
  const { user, quinielaId } = useAuth();
  const { members, matches } = useData();
  // The match is kept live by the app-wide subscription in DataProvider; it
  // arrives here (via the match route reading global state) already updated.
  const match = matchProp;
  const { t } = useTranslation();
  const membersRef = useRef(members);
  const [preds, setPreds] = useState<MatchPrediction[]>([]);
  const [predsLoading, setPredsLoading] = useState(true);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [snapshot, setSnapshot] = useState<Map<string, { cumulativePts: number; rankAtMoment: number }>>(new Map());
  const [tab, setTab] = useState<'predictions' | 'bench' | 'standings'>('predictions');
  const [showRules, setShowRules] = useState(false);
  const [scoreFlash, setScoreFlash] = useState(false);
  const prevScoreRef = useRef(`${match.scoreA}:${match.scoreB}`);

  useEffect(() => {
    membersRef.current = members;
  }, [members]);

  // Brief highlight when the live score changes.
  useEffect(() => {
    const key = `${match.scoreA}:${match.scoreB}`;
    if (prevScoreRef.current === key) return;
    prevScoreRef.current = key;
    setScoreFlash(true);
    const timer = setTimeout(() => setScoreFlash(false), 1200);
    return () => clearTimeout(timer);
  }, [match.scoreA, match.scoreB]);

  useEffect(() => {
    if (!quinielaId) return;
    setPredsLoading(true);
    let cancelled = false;
    // Knockout matches may carry per-user predicted matchups (ONE_SHOT mode);
    // group matches never do, so skip that fetch entirely for them.
    const bracketPromise =
      match.stage !== "GROUP_STAGE"
        ? fetchMatchBracketPredictions(match.id, quinielaId)
        : Promise.resolve({} as Record<string, { predHome: string | null; predAway: string | null }>);
    Promise.all([fetchMatchPredictions(match.id, quinielaId), bracketPromise])
      .then(([raw, bracket]) => {
        const memberMap = new Map(membersRef.current.map((m) => [m.userId, m]));
        return raw.map((r) => {
          const m = memberMap.get(r.userId);
          const b = bracket[r.userId];
          return {
            userId: r.userId,
            displayName: m?.displayName ?? "Unknown",
            avatarColor: m?.avatarColor ?? "#02B906",
            pickA: r.pickA,
            pickB: r.pickB,
            pickPenaltiesWinner: r.pickPenaltiesWinner,
            predHome: b?.predHome ?? null,
            predAway: b?.predAway ?? null,
          };
        });
      })
      .then((mapped) => {
        if (!cancelled) setPreds(mapped);
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setPredsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [match.id, match.stage, quinielaId]); // members intentionally excluded — membersRef stays current

  // Fetch the event feed for live/finished matches; refetch whenever the live
  // score/minute/status changes (realtime pushes those via DataProvider), so a
  // new goal/card/sub appears without leaving the screen.
  useEffect(() => {
    if (match.status !== "live" && match.status !== "finished") {
      setEvents([]);
      return;
    }
    let cancelled = false;
    fetchMatchEvents(match.id)
      .then((data) => {
        if (!cancelled) setEvents(data);
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [
    match.id,
    match.status,
    match.scoreA,
    match.scoreB,
    match.scoreAEt,
    match.scoreBEt,
    match.minute,
  ]);

  useEffect(() => {
    if (match.status !== "finished" || !quinielaId) return;
    fetchMatchLeaderboardSnapshot(match.id, quinielaId).then(setSnapshot).catch(console.error);
  }, [match.id, match.status, quinielaId]);

  const groups = groupPredictions(preds, match, user?.id ?? null);

  const aliveSet = new Set(getAliveTeams(matches));

  const isBenchGroup = (g: PredictionGroup): boolean => {
    if (!g.predHome || !g.predAway) return false;
    if (match.teamA && match.teamB) {
      // Teams known: bench if predicted matchup doesn't match actual (position-sensitive)
      return g.predHome !== match.teamA || g.predAway !== match.teamB;
    }
    // Future bracket slot: bench if either predicted team is already eliminated
    if (match.stage !== 'GROUP_STAGE') {
      return !aliveSet.has(g.predHome) || !aliveSet.has(g.predAway);
    }
    return false;
  };

  const regularGroups = groups.filter(g => !isBenchGroup(g));
  const benchGroups = groups.filter(isBenchGroup);

  const hasTeamInMatch = (g: PredictionGroup): boolean => {
    if (match.teamA && match.teamB) {
      return g.predHome === match.teamA || g.predHome === match.teamB ||
             g.predAway === match.teamA || g.predAway === match.teamB;
    }
    // Future: partial = one team still alive, one eliminated
    return (aliveSet.has(g.predHome!) && !aliveSet.has(g.predAway!)) ||
           (!aliveSet.has(g.predHome!) && aliveSet.has(g.predAway!));
  };

  const toBenchPlayers = (g: PredictionGroup): BenchPlayer[] =>
    g.players.map(p => ({
      ...p,
      predHome: g.predHome,
      predAway: g.predAway,
      pickA: g.pickA,
      pickB: g.pickB,
    }));

  const partialBenchPlayers = benchGroups.filter(hasTeamInMatch).flatMap(toBenchPlayers);
  const fullMissBenchPlayers = benchGroups.filter(g => !hasTeamInMatch(g)).flatMap(toBenchPlayers);
  const stageLabelKey = getStageLabelKey(match.stage);
  const isScored = match.status === "finished" || match.status === "live";
  const now = useNowTick(match.status === "live");
  const isStale = isLiveDataStale(match, now);
  const hasPick = userPick && userPick.pickA !== "" && userPick.pickB !== "";

  let result = null;
  if (isScored && hasPick) {
    result = getPickResult(
      match,
      parseInt(String(userPick!.pickA)),
      parseInt(String(userPick!.pickB)),
    );
  }

  const resultColors: Record<string, string> = {
    exact: "var(--color-green)",
    penalty_exact: "var(--color-green)",
    half: "var(--color-info)",
    tendency: "var(--color-gold)",
    miss: "var(--color-error)",
  };

  return (
    <div>
      {showRules && <RulesModal onClose={() => setShowRules(false)} />}

      <div className='match-detail__back-row'>
        <button className='match-detail__back' onClick={onBack}>
          {t("MATCH_DETAIL_BACK")}
        </button>
        <button
          className='match-detail__info-btn'
          onClick={() => setShowRules(true)}
          aria-label='Rules'
        >
          <Icon icon='mdi:information-outline' width={20} />
        </button>
      </div>

      <div className='match-detail__score-card'>
        <div className='match-detail__group'>
          {stageLabelKey
            ? t(stageLabelKey)
            : `${t("MATCH_CARD_GROUP_PREFIX")} ${match.group}`}
        </div>

        <div className='match-detail__status'>
          <MatchStatusBadge match={match} />
        </div>

        {isStale && (
          <div className='match-detail__stale'>
            {t("MATCH_CARD_STATUS_STALE")}
          </div>
        )}

        <div className='match-detail__score-row'>
          {match.teamA ? (
            <Link to={`/teams/${match.teamA}`} className='match-detail__team'>
              <TeamFlag code={match.teamA} size={48} />
              <span className='match-detail__team-code'>{match.teamA}</span>
              <span className='match-detail__team-full'>
                {TEAM_FULL[match.teamA]}
              </span>
            </Link>
          ) : (
            <div className='match-detail__team'>
              <TeamFlag code={match.teamA} size={48} />
              <span className='match-detail__team-code'>{t("TEAM_TBD")}</span>
            </div>
          )}
          <div
            className={`match-detail__scoreline${
              scoreFlash ? " match-detail__scoreline--flash" : ""
            }`}
          >
            <span>{match.scoreA !== null ? match.scoreA : "–"}</span>
            <span className='match-detail__scoreline-sep'>:</span>
            <span>{match.scoreB !== null ? match.scoreB : "–"}</span>
          </div>
          {match.teamB ? (
            <Link to={`/teams/${match.teamB}`} className='match-detail__team'>
              <TeamFlag code={match.teamB} size={48} />
              <span className='match-detail__team-code'>{match.teamB}</span>
              <span className='match-detail__team-full'>
                {TEAM_FULL[match.teamB]}
              </span>
            </Link>
          ) : (
            <div className='match-detail__team'>
              <TeamFlag code={match.teamB} size={48} />
              <span className='match-detail__team-code'>{t("TEAM_TBD")}</span>
            </div>
          )}
        </div>

        {match.venue && (
          <Link to={`/venues/${encodeURIComponent(match.venue)}`} className='match-detail__venue'>
            <span className='match-detail__venue-name'>{match.venue}</span>
            {match.venueCity && (
              <span className='match-detail__venue-city'>
                {match.venueCity}
                {match.venueCountry && `, ${TEAM_FULL[match.venueCountry]}`}
              </span>
            )}
          </Link>
        )}
      </div>

      <MatchEventTimeline match={match} events={events} />

      {hasPick && (
        <div className='match-detail__my-pick'>
          <div className='match-detail__my-pick-left'>
            <span className='match-detail__my-pick-label'>
              {t("MATCH_DETAIL_YOUR_PREDICTION")}
            </span>
            <span
              className='match-detail__my-pick-score'
              style={{
                color: result ? resultColors[result] : "var(--fg-primary)",
              }}
            >
              {userPick!.pickA} : {userPick!.pickB}
            </span>
          </div>
          {isScored && result && (
            <Badge variant={getResultVariant(result)}>
              +{getResultPoints(result)} {getResultLabel(result)}
            </Badge>
          )}
        </div>
      )}

      {(() => {
        const isScored2 = match.status === "live" || match.status === "finished";
        const hasBench = !predsLoading && (partialBenchPlayers.length > 0 || fullMissBenchPlayers.length > 0);
        const showTabs = isScored2 || hasBench;
        if (!showTabs) return null;
        return (
          <div className='leaderboard__tabs'>
            <button
              className={`leaderboard__tab${tab === 'predictions' ? ' leaderboard__tab--active' : ''}`}
              onClick={() => setTab('predictions')}
            >
              {t('MATCH_DETAIL_TAB_PREDICTIONS')}
            </button>
            {hasBench && (
              <button
                className={`leaderboard__tab${tab === 'bench' ? ' leaderboard__tab--active' : ''}`}
                onClick={() => setTab('bench')}
              >
                {t('MATCH_DETAIL_TAB_BENCH')}
              </button>
            )}
            {isScored2 && (
              <button
                className={`leaderboard__tab${tab === 'standings' ? ' leaderboard__tab--active' : ''}`}
                onClick={() => setTab('standings')}
              >
                {t('MATCH_DETAIL_TAB_STANDINGS')}
              </button>
            )}
          </div>
        );
      })()}

      {tab === 'predictions' && (
        <>
          {predsLoading && (
            <div>
              <div className='match-detail__preds-heading'>
                {t("MATCH_DETAIL_PREDICTIONS_HEADING")}
              </div>
              <div className='match-detail__preds-grid'>
                {Array.from({ length: 4 }, (_, i) => (
                  <PredictionGroupCardSkeleton key={i} />
                ))}
              </div>
            </div>
          )}

          {!predsLoading && regularGroups.length > 0 && (
            <div>
              <div className='match-detail__preds-heading'>
                {t("MATCH_DETAIL_PREDICTIONS_HEADING")} · {preds.length}{" "}
                {t("MATCH_DETAIL_PLAYERS_SUFFIX")}
              </div>
              <div className='match-detail__preds-grid'>
                {regularGroups.map((g) => (
                  <PredictionGroupCard key={g.key} group={g} match={match} />
                ))}
              </div>
            </div>
          )}

          {!predsLoading && regularGroups.length === 0 && groups.length === 0 && (
            <div className='match-detail__empty'>{t("MATCH_DETAIL_EMPTY")}</div>
          )}
        </>
      )}

      {tab === 'bench' && (
        <BenchSection partialPlayers={partialBenchPlayers} missPlayers={fullMissBenchPlayers} stage={match.stage} />
      )}

      {tab === 'standings' && (match.status === "live" || match.status === "finished") && (
        <WhatIfLeaderboard
          match={match}
          members={members}
          preds={preds}
          myUserId={user?.id ?? null}
          snapshot={snapshot}
        />
      )}
    </div>
  );
}
