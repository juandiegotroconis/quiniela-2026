import './GroupMatchRow.css';
import TeamFlag from './TeamFlag';
import Badge from './Badge';
import { getPickResult, getResultVariant, getResultPoints } from '~/lib/helpers';
import type { Match } from '~/lib/types';
import type { UserPickEntry } from '~/lib/auth-context';

interface Props {
  match: Match;
  userPick?: UserPickEntry;
}

const RESULT_COLORS: Record<string, string> = {
  exact: 'var(--color-green)',
  winner: 'var(--color-gold)',
  miss: 'var(--color-error)',
};

export default function GroupMatchRow({ match, userPick }: Props) {
  const isFinished = match.status === 'finished';
  const isLive = match.status === 'live';
  const hasPick = userPick && userPick.pickA !== '' && userPick.pickB !== '';

  let result = null;
  if (isFinished && hasPick) {
    result = getPickResult(match, parseInt(String(userPick!.pickA)), parseInt(String(userPick!.pickB)));
  }

  return (
    <div className="group-match-row">
      <div className="group-match-row__teams">
        <div className="group-match-row__side group-match-row__side--left">
          <span className="group-match-row__team-name">{match.teamA}</span>
          <TeamFlag code={match.teamA} size={20} />
        </div>
        <div className="group-match-row__score">
          {isFinished || isLive ? (
            `${match.scoreA}:${match.scoreB}`
          ) : (
            <span className="group-match-row__time">{match.time}</span>
          )}
        </div>
        <div className="group-match-row__side">
          <TeamFlag code={match.teamB} size={20} />
          <span className="group-match-row__team-name">{match.teamB}</span>
        </div>
      </div>

      {hasPick && (
        <div className="group-match-row__pick">
          <span className="group-match-row__pick-label">You:</span>
          <span
            className="group-match-row__pick-score"
            style={{ color: result ? RESULT_COLORS[result] : 'var(--fg-primary)' }}
          >
            {userPick!.pickA}:{userPick!.pickB}
          </span>
        </div>
      )}

      <div className="group-match-row__result">
        {isFinished && hasPick && result && (
          <Badge variant={getResultVariant(result)}>
            +{getResultPoints(result)}
          </Badge>
        )}
        {isLive && (
          <Badge variant="error">
            <span className="badge__live-dot">●</span> {match.time}
          </Badge>
        )}
        {!isFinished && !isLive && (
          <span className="group-match-row__date">{match.date}</span>
        )}
      </div>
    </div>
  );
}
