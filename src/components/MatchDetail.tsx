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
import {
  groupPredictions,
  getPickResult,
  getResultVariant,
  getResultPoints,
  getResultLabel,
  getLiveMinute,
  formatMatchTime,
  formatMatchDateTime,
  getStageLabelKey,
} from "~/lib/helpers";
import type { Match } from "~/lib/types";
import { TEAM_FULL } from "~/lib/mock-data";
import type { UserPickEntry } from "~/lib/auth-context";
import { useAuth } from "~/lib/auth-context";
import { useData } from "~/lib/data-context";
import { fetchMatchPredictions } from "~/lib/queries";
import type { MatchPrediction } from "~/lib/types";

interface Props {
  match: Match;
  onBack: () => void;
  userPick?: UserPickEntry;
}

function MatchStatusBadge({ match }: { match: Match }) {
  const { t, language } = useTranslation();
  if (match.status === "live") {
    return (
      <Badge variant='error'>
        <span className='badge__live-dot'>●</span> {t("MATCH_STATUS_LIVE")}{" "}
        {getLiveMinute(match) ?? formatMatchTime(match.utcDate, language)}
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

export default function MatchDetail({ match, onBack, userPick }: Props) {
  const { user, quinielaId } = useAuth();
  const { members } = useData();
  const { t } = useTranslation();
  const membersRef = useRef(members);
  const [preds, setPreds] = useState<MatchPrediction[]>([]);
  const [predsLoading, setPredsLoading] = useState(true);
  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    membersRef.current = members;
  }, [members]);

  useEffect(() => {
    if (!quinielaId) return;
    setPredsLoading(true);
    let cancelled = false;
    fetchMatchPredictions(match.id, quinielaId)
      .then((raw) => {
        const memberMap = new Map(membersRef.current.map((m) => [m.userId, m]));
        return raw.map((r) => {
          const m = memberMap.get(r.userId);
          return {
            userId: r.userId,
            displayName: m?.displayName ?? "Unknown",
            avatarColor: m?.avatarColor ?? "#02B906",
            pickA: r.pickA,
            pickB: r.pickB,
            pickPenaltiesWinner: r.pickPenaltiesWinner,
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
  }, [match.id, quinielaId]); // members intentionally excluded — membersRef stays current

  const groups = groupPredictions(preds, match, user?.id ?? null);
  const stageLabelKey = getStageLabelKey(match.stage);
  const isScored = match.status === "finished" || match.status === "live";
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
          <div className='match-detail__scoreline'>
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

      {!predsLoading && groups.length > 0 && (
        <div>
          <div className='match-detail__preds-heading'>
            {t("MATCH_DETAIL_PREDICTIONS_HEADING")} · {preds.length}{" "}
            {t("MATCH_DETAIL_PLAYERS_SUFFIX")}
          </div>
          <div className='match-detail__preds-grid'>
            {groups.map((g) => (
              <PredictionGroupCard key={g.key} group={g} match={match} />
            ))}
          </div>
        </div>
      )}

      {!predsLoading && groups.length === 0 && (
        <div className='match-detail__empty'>{t("MATCH_DETAIL_EMPTY")}</div>
      )}

      {(match.status === "live" || match.status === "finished") && (
        <WhatIfLeaderboard
          match={match}
          members={members}
          preds={preds}
          myUserId={user?.id ?? null}
        />
      )}
    </div>
  );
}
