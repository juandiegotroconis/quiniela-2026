import './MatchDetail.css';
import TeamFlag from './TeamFlag';
import Badge from './Badge';
import PredictionGroupCard from './PredictionGroupCard';
import { groupPredictions, getPickResult, getResultVariant, getResultPoints, getResultLabel } from '~/lib/helpers';
import type { Match } from '~/lib/mock-data';
import { TEAM_FULL, PREDICTIONS } from '~/lib/mock-data';
import type { UserPickEntry } from '~/lib/auth-context';

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
  return (
    <span className="match-detail__status-time">
      {match.date} · {match.time}
    </span>
  );
}

export default function MatchDetail({ match, onBack, userPick }: Props) {
  const groups = groupPredictions(match.id);
  const hasPredictions = groups.length > 0;
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

  const totalPreds = (PREDICTIONS[match.id] ?? []).length;

  return (
    <div>
      <button className="match-detail__back" onClick={onBack}>
        ← Back to matches
      </button>

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

      {hasPredictions && (
        <div>
          <div className="match-detail__preds-heading">
            Predictions · {totalPreds} players
          </div>
          <div className="match-detail__preds-grid">
            {groups.map(g => (
              <PredictionGroupCard key={g.key} group={g} match={match} />
            ))}
          </div>
        </div>
      )}

      {!hasPredictions && (
        <div className="match-detail__empty">
          Predictions will be revealed once the match begins.
        </div>
      )}
    </div>
  );
}
