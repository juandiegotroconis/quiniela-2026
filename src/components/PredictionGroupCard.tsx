import './PredictionGroupCard.css';
import Avatar from './Avatar';
import Badge from './Badge';
import type { PredictionGroup } from '~/lib/helpers';
import type { Match } from '~/lib/types';

interface Props {
  group: PredictionGroup;
  match: Match;
}

export default function PredictionGroupCard({ group, match }: Props) {
  const resultColors = {
    exact: 'var(--color-green-25)',
    winner: 'rgba(200,169,78,0.25)',
    miss: 'rgba(255,255,255,0.06)',
  };
  const borderColor = group.hasMe
    ? 'var(--color-green-25)'
    : group.result
    ? resultColors[group.result]
    : 'var(--border-subtle)';

  return (
    <div
      className={`pred-group-card${group.hasMe ? ' pred-group-card--me' : ''}`}
      style={{ borderColor }}
    >
      {group.hasMe && <div className="pred-group-card__your-pick">Your pick</div>}

      <div className="pred-group-card__score">
        <span>{group.pickA}</span>
        <span className="pred-group-card__score-sep">-</span>
        <span>{group.pickB}</span>
      </div>

      {match.status === 'finished' && group.result && (
        <div className="pred-group-card__badge">
          <Badge variant={group.variant ?? 'default'}>
            +{group.points} {group.label}
          </Badge>
        </div>
      )}

      <div className="pred-group-card__players">
        {group.players.map(p => (
          <div key={p.userId} className="pred-group-card__player" title={p.displayName}>
            <Avatar name={p.displayName} color={p.avatarColor} size={28} />
            <span className={`pred-group-card__player-name${p.isMe ? ' pred-group-card__player-name--me' : ''}`}>
              {p.isMe ? 'You' : p.displayName.split(' ')[0]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
