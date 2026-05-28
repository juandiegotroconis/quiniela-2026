import './PlayerProfile.css';
import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import PageContainer from './PageContainer';
import Avatar from './Avatar';
import Badge from './Badge';
import PositionChange from './PositionChange';
import Sparkline from './Sparkline';
import TeamFlag from './TeamFlag';
import { getPickResult, getResultVariant, getResultPoints } from '~/lib/helpers';
import { fetchSingleMemberHistory } from '~/lib/queries';
import { useAuth } from '~/lib/auth-context';
import { useData } from '~/lib/data-context';
import type { UserPickEntry } from '~/lib/auth-context';

interface Props {
  userId: string;
}

const RESULT_COLORS: Record<string, string> = {
  exact: 'var(--color-green)',
  winner: 'var(--color-gold)',
  miss: 'var(--color-error)',
};

export default function PlayerProfile({ userId }: Props) {
  const { user, quinielaId, userPicks: myPicks } = useAuth();
  const { matches, getMember, getPicksForUser } = useData();
  const isMe = userId === user?.id;
  const [picks, setPicks] = useState<Record<number, UserPickEntry>>(isMe ? myPicks : {});
  const [memberHistory, setMemberHistory] = useState<number[]>([]);

  const member = getMember(userId);

  useEffect(() => {
    if (isMe) {
      setPicks(myPicks);
      return;
    }
    if (!quinielaId) return;
    getPicksForUser(userId, quinielaId).then(setPicks).catch(console.error);
  }, [userId, quinielaId, isMe, myPicks, getPicksForUser]);

  useEffect(() => {
    if (!quinielaId) return;
    fetchSingleMemberHistory(userId, quinielaId).then(setMemberHistory).catch(console.error);
  }, [userId, quinielaId]);

  if (!member) {
    return (
      <PageContainer>
        <Link to="/rankings" className="player-profile__back">← Rankings</Link>
        <div className="player-profile__not-found">Player not found.</div>
      </PageContainer>
    );
  }

  const displayName = isMe ? (user?.name ?? 'You') : member.displayName;

  const matchdays = [1, 2, 3].map(day => ({
    day,
    label: `Matchday ${day}`,
    matches: matches.filter(m => m.day === day),
  }));

  const finishedMatches = matches.filter(m => {
    if (m.status !== 'finished') return false;
    const p = picks[m.id];
    return p && p.pickA !== '' && p.pickB !== '';
  });

  const exactCount = finishedMatches.filter(m => {
    const p = picks[m.id];
    return getPickResult(m, parseInt(String(p.pickA)), parseInt(String(p.pickB))) === 'exact';
  }).length;

  const winnerCount = finishedMatches.filter(m => {
    const p = picks[m.id];
    return getPickResult(m, parseInt(String(p.pickA)), parseInt(String(p.pickB))) === 'winner';
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
        <Avatar name={displayName} color={member.avatarColor} size={64} />
        <div className="player-profile__header-info">
          <div className="player-profile__name">{displayName}</div>
          <div className="player-profile__rank-row">
            <span className="player-profile__rank-label">
              Rank <span className="player-profile__rank-num">#{member.rank}</span>
            </span>
            <PositionChange current={member.rank} previous={member.prevRank ?? member.rank} />
            <span className="player-profile__pts">{member.pts} pts</span>
          </div>
          <div className="player-profile__sparkline">
            <Sparkline history={memberHistory} />
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
              const pick = picks[m.id];
              const hasPick = pick && pick.pickA !== '' && pick.pickB !== '';
              const isFinished = m.status === 'finished';
              const isLive = m.status === 'live';
              const result = isFinished && hasPick
                ? getPickResult(m, parseInt(String(pick!.pickA)), parseInt(String(pick!.pickB)))
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
