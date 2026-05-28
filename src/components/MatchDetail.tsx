import './MatchDetail.css';
import { useState, useEffect, useRef } from 'react';
import TeamFlag from './TeamFlag';
import Badge from './Badge';
import PredictionGroupCard from './PredictionGroupCard';
import { groupPredictions, getPickResult, getResultVariant, getResultPoints, getResultLabel } from '~/lib/helpers';
import type { Match } from '~/lib/types';
import { TEAM_FULL } from '~/lib/mock-data';
import type { UserPickEntry } from '~/lib/auth-context';
import { useAuth } from '~/lib/auth-context';
import { useData } from '~/lib/data-context';
import { fetchMatchPredictions } from '~/lib/queries';
import type { MatchPrediction } from '~/lib/types';

interface Props {
  match: Match;
  onBack: () => void;
  userPick?: UserPickEntry;
}

function MatchStatusBadge({ match }: { match: Match }) {
  if (match.status === 'live') {
    return (
      <Badge variant="error">
        <span className="badge__live-dot">●</span> LIVE {match.time}
      </Badge>
    );
  }
  if (match.status === 'finished') return <Badge variant="default">FT</Badge>;
  return <span className="match-detail__status-time">{match.date} · {match.time}</span>;
}

export default function MatchDetail({ match, onBack, userPick }: Props) {
  const { user, quinielaId } = useAuth();
  const { members } = useData();
  const membersRef = useRef(members);
  const [preds, setPreds] = useState<MatchPrediction[]>([]);

  useEffect(() => { membersRef.current = members; }, [members]);

  useEffect(() => {
    if (!quinielaId) return;
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
          };
        });
      })
      .then(setPreds)
      .catch(console.error);
  }, [match.id, quinielaId]); // members intentionally excluded — membersRef stays current

  const groups = groupPredictions(preds, match, user?.id ?? null);
  const isFinished = match.status === 'finished';
  const hasPick = userPick && userPick.pickA !== '' && userPick.pickB !== '';

  let result = null;
  if (isFinished && hasPick) {
    result = getPickResult(match, parseInt(String(userPick!.pickA)), parseInt(String(userPick!.pickB)));
  }

  const resultColors: Record<string, string> = {
    exact: 'var(--color-green)',
    winner: 'var(--color-gold)',
    miss: 'var(--color-error)',
  };

  return (
    <div>
      <button className="match-detail__back" onClick={onBack}>← Back to matches</button>

      <div className="match-detail__score-card">
        <div className="match-detail__score-row">
          <div className="match-detail__team">
            <TeamFlag code={match.teamA} size={48} />
            <span className="match-detail__team-code">{match.teamA}</span>
            <span className="match-detail__team-full">{TEAM_FULL[match.teamA]}</span>
          </div>
          <div className="match-detail__scoreline">
            <span>{match.scoreA !== null ? match.scoreA : '–'}</span>
            <span className="match-detail__scoreline-sep">:</span>
            <span>{match.scoreB !== null ? match.scoreB : '–'}</span>
          </div>
          <div className="match-detail__team">
            <TeamFlag code={match.teamB} size={48} />
            <span className="match-detail__team-code">{match.teamB}</span>
            <span className="match-detail__team-full">{TEAM_FULL[match.teamB]}</span>
          </div>
        </div>
        <div className="match-detail__status">
          <MatchStatusBadge match={match} />
        </div>
      </div>

      {hasPick && (
        <div className="match-detail__my-pick">
          <div className="match-detail__my-pick-left">
            <span className="match-detail__my-pick-label">Your prediction</span>
            <span
              className="match-detail__my-pick-score"
              style={{ color: result ? resultColors[result] : 'var(--fg-primary)' }}
            >
              {userPick!.pickA} : {userPick!.pickB}
            </span>
          </div>
          {isFinished && result && (
            <Badge variant={getResultVariant(result)}>
              +{getResultPoints(result)} {getResultLabel(result)}
            </Badge>
          )}
        </div>
      )}

      {groups.length > 0 && (
        <div>
          <div className="match-detail__preds-heading">
            Predictions · {preds.length} players
          </div>
          <div className="match-detail__preds-grid">
            {groups.map(g => (
              <PredictionGroupCard key={g.key} group={g} match={match} />
            ))}
          </div>
        </div>
      )}

      {groups.length === 0 && (
        <div className="match-detail__empty">
          Predictions will be revealed once the match begins.
        </div>
      )}
    </div>
  );
}
