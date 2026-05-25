import './ProfileReadOnly.css';
import PageContainer from './PageContainer';
import Avatar from './Avatar';
import Badge from './Badge';
import PositionChange from './PositionChange';
import TeamFlag from './TeamFlag';
import TopScorerPicker from './TopScorerPicker';
import { getPickResult, getResultVariant, getResultPoints } from '~/lib/helpers';
import { PLAYERS, MATCHES, ME_ID } from '~/lib/mock-data';
import type { TopScorerSuggestion } from '~/lib/mock-data';
import type { UserPickEntry } from '~/lib/auth-context';

interface Props {
  userPicks: Record<number, UserPickEntry>;
  topScorer: TopScorerSuggestion | null;
  onLogout: () => void;
}

const RESULT_COLORS: Record<string, string> = {
  exact: 'var(--color-green)',
  winner: 'var(--color-gold)',
  miss: 'var(--color-error)',
};

export default function ProfileReadOnly({ userPicks, topScorer, onLogout }: Props) {
  const me = PLAYERS.find(p => p.id === ME_ID)!;

  const matchdays = [1, 2, 3].map(day => ({
    day,
    label: `Matchday ${day}`,
    matches: MATCHES.filter(m => m.day === day),
  }));

  const finishedWithPicks = MATCHES.filter(m => {
    if (m.status !== 'finished') return false;
    const p = userPicks[m.id];
    return p && p.pickA !== '' && p.pickB !== '';
  });

  const exactCount = finishedWithPicks.filter(m => {
    const p = userPicks[m.id];
    return getPickResult(m, parseInt(String(p.pickA)), parseInt(String(p.pickB))) === 'exact';
  }).length;

  const winnerCount = finishedWithPicks.filter(m => {
    const p = userPicks[m.id];
    return getPickResult(m, parseInt(String(p.pickA)), parseInt(String(p.pickB))) === 'winner';
  }).length;

  const missed = finishedWithPicks.length - exactCount - winnerCount;
  const accuracy = finishedWithPicks.length > 0
    ? Math.round(((exactCount + winnerCount) / finishedWithPicks.length) * 100) + '%'
    : '—';

  const stats = [
    { label: 'Exact scores', value: exactCount, color: 'var(--color-green)' },
    { label: 'Correct winner', value: winnerCount, color: 'var(--color-gold)' },
    { label: 'Missed', value: missed, color: 'var(--color-error)' },
    { label: 'Accuracy', value: accuracy, color: 'var(--color-info)' },
  ];

  return (
    <PageContainer>
      <div className="profile-ro__header">
        <Avatar name={me.name} index={me.id - 1} size={64} />
        <div className="profile-ro__header-info">
          <div className="profile-ro__name">Your Profile</div>
          <div className="profile-ro__rank-row">
            <span className="profile-ro__rank-label">
              Rank <span className="profile-ro__rank-num">#{me.rank}</span>
            </span>
            <PositionChange current={me.rank} previous={me.prevRank} />
            <span className="profile-ro__pts">{me.pts} pts</span>
          </div>
        </div>
        <button className="profile-ro__logout" onClick={onLogout}>
          Log Out
        </button>
      </div>

      <div className="profile-ro__stats">
        {stats.map((s, i) => (
          <div key={i} className="profile-ro__stat-card">
            <div className="profile-ro__stat-value" style={{ color: s.color }}>
              {s.value}
            </div>
            <div className="profile-ro__stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="profile-ro__scorer">
        <div className="profile-ro__scorer-heading">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--color-gold)">
            <path d="M7.5 21H2V9h5.5v12zm7.25-18h-5.5v18h5.5V3zM22 11h-5.5v10H22V11z" />
          </svg>
          Top Scorer Prediction
        </div>
        <TopScorerPicker value={topScorer} disabled />
        <p className="profile-ro__scorer-note">
          +15 bonus points if correct at end of tournament
        </p>
      </div>

      <div className="profile-ro__preds-heading">
        Your Predictions
        <Badge variant="default">Locked</Badge>
      </div>

      {matchdays.map(md => (
        <div key={md.day} className="profile-ro__matchday">
          <div className="profile-ro__matchday-label">{md.label}</div>
          <div className="profile-ro__match-list">
            {md.matches.map(m => {
              const pick = userPicks[m.id];
              const hasPick = pick && pick.pickA !== '' && pick.pickB !== '';
              const isFinished = m.status === 'finished';
              const isLive = m.status === 'live';
              let result = null;
              if (isFinished && hasPick) {
                result = getPickResult(m, parseInt(String(pick.pickA)), parseInt(String(pick.pickB)));
              }

              return (
                <div key={m.id} className="profile-ro__match-row">
                  <div className="profile-ro__match-teams">
                    <TeamFlag code={m.teamA} size={20} />
                    <span className="profile-ro__match-vs">vs</span>
                    <TeamFlag code={m.teamB} size={20} />
                  </div>
                  <div className="profile-ro__match-result">
                    {isFinished || isLive ? (
                      <span className="profile-ro__match-score-actual">
                        {m.scoreA}:{m.scoreB}
                      </span>
                    ) : (
                      <span className="profile-ro__match-date">{m.date}</span>
                    )}
                  </div>
                  <div className="profile-ro__match-pick-wrap">
                    <span className="profile-ro__match-pick-label">Your pick:</span>
                    <span
                      className="profile-ro__match-pick-score"
                      style={{ color: result ? RESULT_COLORS[result] : 'var(--fg-primary)' }}
                    >
                      {hasPick ? `${pick.pickA}:${pick.pickB}` : '—'}
                    </span>
                  </div>
                  <div className="profile-ro__match-badge">
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
