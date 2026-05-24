import './PredictionGroupCard.css';
import Avatar from './Avatar';
import Badge from './Badge';
import type { PredictionGroup } from '~/lib/helpers';
import type { Match } from '~/lib/mock-data';
import { ME_ID } from '~/lib/mock-data';

interface Props {
  group: PredictionGroup;
  match: Match;
}

export default function PredictionGroupCard({ group, match }: Props) {
  const resultColors = {
    exact: 'rgba(2,185,6,0.25)',
    winner: 'rgba(200,169,78,0.25)',
    miss: 'rgba(255,255,255,0.06)',
  };
  const borderColor = group.hasMe
    ? 'rgba(2,185,6,0.25)'
    : group.result
    ? resultColors[group.result]
    : 'var(--border-subtle)';

  return (
    <div
      className={`pred-group-card${group.hasMe ? ' pred-group-card--me' : ''}`}
      style={{ borderColor }}
    >
      {group.hasMe && (
        <div className="pred-group-card__your-pick">Your pick</div>
      )}

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
        {group.players.map(p => {
          if (!p) return null;
          const isMe = p.id === ME_ID;
          return (
            <div key={p.id} className="pred-group-card__player" title={p.name}>
              <Avatar name={p.name} index={p.id - 1} size={28} />
              <span className={`pred-group-card__player-name${isMe ? ' pred-group-card__player-name--me' : ''}`}>
                {isMe ? 'You' : p.name.split(' ')[0]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
