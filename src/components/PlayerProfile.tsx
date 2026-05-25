import './PlayerProfile.css';
import { Link } from 'react-router';
import PageContainer from './PageContainer';
import Avatar from './Avatar';
import Badge from './Badge';
import PositionChange from './PositionChange';
import Sparkline from './Sparkline';
import TeamFlag from './TeamFlag';
import { getPickResult, getResultVariant, getResultPoints } from '~/lib/helpers';
import { PLAYERS, MATCHES, PREDICTIONS, ME_ID } from '~/lib/mock-data';
import { useAuth } from '~/lib/auth-context';

interface Props {
  playerId: number;
}

const RESULT_COLORS: Record<string, string> = {
  exact: 'var(--color-green)',
  winner: 'var(--color-gold)',
  miss: 'var(--color-error)',
};

export default function PlayerProfile({ playerId }: Props) {
  const { user } = useAuth();
  const player = PLAYERS.find(p => p.id === playerId);
  const isMe = playerId === ME_ID;

  if (!player) {
    return (
      <PageContainer>
        <Link to="/rankings" className="player-profile__back">← Rankings</Link>
        <div className="player-profile__not-found">Player not found.</div>
      </PageContainer>
    );
  }

  const displayName = isMe ? (user?.name ?? 'You') : player.name;

  const matchdays = [1, 2, 3].map(day => ({
    day,
    label: `Matchday ${day}`,
    matches: MATCHES.filter(m => m.day === day),
  }));

  const finishedMatches = MATCHES.filter(m => {
    if (m.status !== 'finished') return false;
    const preds = PREDICTIONS[m.id];
    return preds?.some(p => p.playerId === playerId);
  });

  const exactCount = finishedMatches.filter(m => {
    const pick = PREDICTIONS[m.id]?.find(p => p.playerId === playerId);
    return pick && getPickResult(m, pick.pickA, pick.pickB) === 'exact';
  }).length;

  const winnerCount = finishedMatches.filter(m => {
    const pick = PREDICTIONS[m.id]?.find(p => p.playerId === playerId);
    return pick && getPickResult(m, pick.pickA, pick.pickB) === 'winner';
  }).length;

  const missed = finishedMatches.length - exactCount - winnerCount;
  const accuracy = finishedMatches.length > 0
    ? Math.round(((exactCount + winnerCount) / finishedMatches.length) * 100) + '%'
    : '—';

  const stats = [
    { label: 'Exact scores', value: exactCount, color: 'var(--color-green)' },
    { label: 'Correct winner', value: winnerCount, color: 'var(--color-gold)' },
    { label: 'Missed', value: missed, color: 'var(--color-error)' },
    { label: 'Accuracy', value: accuracy, color: 'var(--color-info)' },
  ];

  return (
    <PageContainer>
      <Link to="/rankings" className="player-profile__back">← Rankings</Link>

      <div className="player-profile__header">
        <Avatar name={displayName} index={player.id - 1} size={64} />
        <div className="player-profile__header-info">
          <div className="player-profile__name">{displayName}</div>
          <div className="player-profile__rank-row">
            <span className="player-profile__rank-label">
              Rank <span className="player-profile__rank-num">#{player.rank}</span>
            </span>
            <PositionChange current={player.rank} previous={player.prevRank} />
            <span className="player-profile__pts">{player.pts} pts</span>
          </div>
          <div className="player-profile__sparkline">
            <Sparkline history={player.history} />
          </div>
        </div>
      </div>

      <div className="player-profile__stats">
        {stats.map((s, i) => (
          <div key={i} className="player-profile__stat-card">
            <div className="player-profile__stat-value" style={{ color: s.color }}>
              {s.value}
            </div>
            <div className="player-profile__stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="player-profile__preds-heading">
        Predictions
        <Badge variant="default">Public</Badge>
      </div>

      {matchdays.map(md => (
        <div key={md.day} className="player-profile__matchday">
          <div className="player-profile__matchday-label">{md.label}</div>
          <div className="player-profile__match-list">
            {md.matches.map(m => {
              const pick = PREDICTIONS[m.id]?.find(p => p.playerId === playerId);
              const hasPick = !!pick;
              const isFinished = m.status === 'finished';
              const isLive = m.status === 'live';
              const result = isFinished && hasPick
                ? getPickResult(m, pick!.pickA, pick!.pickB)
                : null;

              return (
                <div key={m.id} className="player-profile__match-row">
                  <div className="player-profile__match-teams">
                    <TeamFlag code={m.teamA} size={20} />
                    <span className="player-profile__match-vs">vs</span>
                    <TeamFlag code={m.teamB} size={20} />
                  </div>
                  <div className="player-profile__match-result">
                    {isFinished || isLive ? (
                      <span className="player-profile__match-score-actual">
                        {m.scoreA}:{m.scoreB}
                      </span>
                    ) : (
                      <span className="player-profile__match-date">{m.date}</span>
                    )}
                  </div>
                  <div className="player-profile__match-pick-wrap">
                    <span className="player-profile__match-pick-label">Pick:</span>
                    <span
                      className="player-profile__match-pick-score"
                      style={{ color: result ? RESULT_COLORS[result] : 'var(--fg-primary)' }}
                    >
                      {hasPick ? `${pick!.pickA}:${pick!.pickB}` : '—'}
                    </span>
                  </div>
                  <div className="player-profile__match-badge">
                    {isFinished && hasPick && result && (
                      <Badge variant={getResultVariant(result)}>
                        +{getResultPoints(result)}
                      </Badge>
                    )}
                    {isLive && (
                      <Badge variant="error">
                        <span className="badge__live-dot">●</span> Live
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </PageContainer>
  );
}
