import './ProfileReadOnly.css';
import PageContainer from './PageContainer';
import { useTranslation } from '~/hooks/useTranslation';
import Badge from './Badge';
import TopScorerPicker from './TopScorerPicker';
import MatchPickList from './MatchPickList';
import { getPickResult } from '~/lib/helpers';
import type { TopScorerSuggestion } from '~/lib/mock-data';
import type { UserPickEntry } from '~/lib/auth-context';
import { useData } from '~/lib/data-context';

interface Props {
  userPicks: Record<number, UserPickEntry>;
  topScorer: TopScorerSuggestion | null;
}

export default function ProfileReadOnly({ userPicks, topScorer }: Props) {
  const { matches } = useData();
  const { t } = useTranslation();

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

      {topScorer && (
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
      )}

      <div className="profile-ro__preds-heading">
        {t('PROFILE_READONLY_PREDICTIONS_HEADING')}
        <Badge variant="default">{t('PROFILE_READONLY_LOCKED_BADGE')}</Badge>
      </div>

      <MatchPickList matches={matches} picks={userPicks} />
    </PageContainer>
  );
}
