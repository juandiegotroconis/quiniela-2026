import './MatchesScreen.css';
import { useMemo, useState } from 'react';
import { useTranslation } from '~/hooks/useTranslation';
import PageContainer from './PageContainer';
import Wc26Banner from './Wc26Banner';
import SectionHeader from './SectionHeader';
import FilterTabs from './FilterTabs';
import MatchCard from './MatchCard';
import MatchDetail from './MatchDetail';
import { useData } from '~/lib/data-context';
import type { Match } from '~/lib/types';
import { useAuth } from '~/lib/auth-context';


function formatDateChip(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00Z');
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(d);
}

export default function MatchesScreen() {
  const [tab, setTab] = useState('all');
  const [group, setGroup] = useState('all');
  const [date, setDate] = useState('all');
  const [selected, setSelected] = useState<Match | null>(null);
  const { userPicks } = useAuth();
  const { matches, matchesLoading } = useData();
  const { t } = useTranslation();

  const FILTER_TABS = [
    { id: 'all', label: t('MATCHES_FILTER_ALL') },
    { id: 'live', label: t('MATCHES_FILTER_LIVE') },
    { id: 'upcoming', label: t('MATCHES_FILTER_UPCOMING') },
    { id: 'finished', label: t('MATCHES_FILTER_FINISHED') },
  ];

  const groups = useMemo(() => {
    const seen = new Set<string>();
    for (const m of matches) if (m.group) seen.add(m.group);
    return [...seen].sort();
  }, [matches]);

  const dates = useMemo(() => {
    const seen = new Set<string>();
    for (const m of matches) {
      const day = m.utcDate.slice(0, 10);
      if (day) seen.add(day);
    }
    return [...seen].sort();
  }, [matches]);

  const filtered = matches.filter(m => {
    if (tab === 'live' && m.status !== 'live') return false;
    if (tab === 'upcoming' && m.status !== 'upcoming') return false;
    if (tab === 'finished' && m.status !== 'finished') return false;
    if (group !== 'all' && m.group !== group) return false;
    if (date !== 'all' && !m.utcDate.startsWith(date)) return false;
    return true;
  });

  if (selected) {
    return (
      <PageContainer>
        <MatchDetail
          match={selected}
          onBack={() => setSelected(null)}
          userPick={userPicks[selected.id]}
        />
      </PageContainer>
    );
  }

  return (
    <>
      <Wc26Banner />
      <PageContainer>
      <div className="matches-screen__header">
        <SectionHeader title={t('MATCHES_TITLE')} subtitle={t('MATCHES_SUBTITLE')} />
        <FilterTabs tabs={FILTER_TABS} active={tab} onChange={setTab} />
      </div>

      <div className="matches-screen__filter-row">
        <button
          className={`matches-screen__chip${group === 'all' ? ' matches-screen__chip--active' : ''}`}
          onClick={() => setGroup('all')}
        >
          {t('MATCHES_GROUP_ALL')}
        </button>
        {groups.map(g => (
          <button
            key={g}
            className={`matches-screen__chip${group === g ? ' matches-screen__chip--active' : ''}`}
            onClick={() => setGroup(g)}
          >
            {t('MATCHES_GROUP_PREFIX')} {g}
          </button>
        ))}
      </div>

      <div className="matches-screen__filter-row matches-screen__filter-row--dates">
        <button
          className={`matches-screen__chip${date === 'all' ? ' matches-screen__chip--active' : ''}`}
          onClick={() => setDate('all')}
        >
          {t('MATCHES_DATE_ALL')}
        </button>
        {dates.map(d => (
          <button
            key={d}
            className={`matches-screen__chip${date === d ? ' matches-screen__chip--active' : ''}`}
            onClick={() => setDate(d)}
          >
            {formatDateChip(d)}
          </button>
        ))}
      </div>

      {matchesLoading && <div className="matches-screen__empty">{t('MATCHES_LOADING')}</div>}

      {!matchesLoading && filtered.length === 0 && (
        <div className="matches-screen__empty">{t('MATCHES_EMPTY')}</div>
      )}

      <div className="matches-screen__grid">
        {filtered.map(m => (
          <MatchCard key={m.id} match={m} onTap={() => setSelected(m)} userPick={userPicks[m.id]} />
        ))}
      </div>
    </PageContainer>
    </>
  );
}
