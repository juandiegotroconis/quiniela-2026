import './ProfileReadOnly.css';
import PageContainer from './PageContainer';
import { useTranslation } from '~/hooks/useTranslation';
import Badge from './Badge';
import TeamFlag from './TeamFlag';
import TopScorerPicker from './TopScorerPicker';
import { getPickResult, getResultVariant, getResultPoints, getLiveMinute, formatMatchDate } from '~/lib/helpers';
import type { TopScorerSuggestion } from '~/lib/mock-data';
import type { UserPickEntry } from '~/lib/auth-context';
import { useData } from '~/lib/data-context';

interface Props {
  userPicks: Record<number, UserPickEntry>;
  topScorer: TopScorerSuggestion | null;
}

const RESULT_COLORS: Record<string, string> = {
  exact: 'var(--color-green)',
  winner: 'var(--color-gold)',
  miss: 'var(--color-error)',
};

export default function ProfileReadOnly({ userPicks, topScorer }: Props) {
  const { matches } = useData();
  const { t, language } = useTranslation();

  const matchdays = [1, 2, 3].map(day => ({
    day,
    label: `${t('PROFILE_READONLY_MATCHDAY_PREFIX')} ${day}`,
    matches: matches.filter(m => m.day === day),
  }));

  const finishedWithPicks = matches.filter(m => {
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
    return getPickResult(m, parseInt(String(p.pickA)), parseInt(String(p.pickB))) === 'tendency';
  }).length;

  const missed = finishedWithPicks.length - exactCount - winnerCount;
  const accuracy = finishedWithPicks.length > 0
    ? Math.round(((exactCount + winnerCount) / finishedWithPicks.length) * 100) + '%'
    : '—';

  const stats = [
    { label: t('PROFILE_READONLY_STAT_EXACT'), value: exactCount, color: 'var(--color-green)' },
    { label: t('PROFILE_READONLY_STAT_WINNER'), value: winnerCount, color: 'var(--color-gold)' },
    { label: t('PROFILE_READONLY_STAT_MISSED'), value: missed, color: 'var(--color-error)' },
    { label: t('PROFILE_READONLY_STAT_ACCURACY'), value: accuracy, color: 'var(--color-info)' },
  ];

  return (
    <PageContainer>
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
          {t('PROFILE_READONLY_TOP_SCORER_HEADING')}
        </div>
        <TopScorerPicker value={topScorer} disabled />
        <p className="profile-ro__scorer-note">
          {t('PROFILE_READONLY_TOP_SCORER_NOTE')}
        </p>
      </div>

      <div className="profile-ro__preds-heading">
        {t('PROFILE_READONLY_PREDICTIONS_HEADING')}
        <Badge variant="default">{t('PROFILE_READONLY_LOCKED_BADGE')}</Badge>
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
                    <span className="profile-ro__match-vs">{t('PROFILE_READONLY_VS')}</span>
                    <TeamFlag code={m.teamB} size={20} />
                  </div>
                  <div className="profile-ro__match-result">
                    {isFinished || isLive ? (
                      <span className="profile-ro__match-score-actual">
                        {m.scoreA}:{m.scoreB}
                      </span>
                    ) : (
                      <span className="profile-ro__match-date">{formatMatchDate(m.utcDate, language)}</span>
                    )}
                  </div>
                  <div className="profile-ro__match-pick-wrap">
                    <span className="profile-ro__match-pick-label">{t('PROFILE_READONLY_YOUR_PICK')}</span>
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
                        <span className="badge__live-dot">●</span> {t('MATCH_CARD_STATUS_LIVE')}{getLiveMinute(m) ? ` ${getLiveMinute(m)}` : ''}
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
