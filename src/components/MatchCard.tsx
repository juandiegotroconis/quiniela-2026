import './MatchCard.css';
import TeamFlag from './TeamFlag';
import Badge from './Badge';
import type { Match } from '~/lib/types';
import type { UserPickEntry } from '~/lib/auth-context';

interface Props {
  match: Match;
  onTap: () => void;
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
  if (match.status === 'finished') {
    return <Badge variant="default">FT</Badge>;
  }
  return (
    <span className="match-card__time">
      {match.date} · {match.time}
    </span>
  );
}

export default function MatchCard({ match, onTap, userPick }: Props) {
  const isLive = match.status === 'live';
  return (
    <div
      className={`match-card${isLive ? ' match-card--live' : ''}`}
      onClick={onTap}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onTap()}
    >
      <div className="match-card__header">
        <span className="match-card__meta">
          Group {match.group} · {match.date}
        </span>
        <MatchStatusBadge match={match} />
      </div>

      <div className="match-card__score-row">
        <div className="match-card__team">
          <TeamFlag code={match.teamA} size={30} />
          <span className="match-card__team-name">{match.teamA}</span>
        </div>
        <div className="match-card__score">
          <span>{match.scoreA !== null ? match.scoreA : '–'}</span>
          <span className="match-card__score-sep">:</span>
          <span>{match.scoreB !== null ? match.scoreB : '–'}</span>
        </div>
        <div className="match-card__team">
          <TeamFlag code={match.teamB} size={30} />
          <span className="match-card__team-name">{match.teamB}</span>
        </div>
      </div>

      {userPick && userPick.pickA !== '' && userPick.pickB !== '' && (
        <div className="match-card__pick">
          <span className="match-card__pick-label">Your pick:</span>
          {userPick.pickA} - {userPick.pickB}
        </div>
      )}
    </div>
  );
}
