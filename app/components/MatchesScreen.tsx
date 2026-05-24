import './MatchesScreen.css';
import { useState } from 'react';
import PageContainer from './PageContainer';
import SectionHeader from './SectionHeader';
import FilterTabs from './FilterTabs';
import MatchCard from './MatchCard';
import MatchDetail from './MatchDetail';
import { MATCHES } from '~/lib/mock-data';
import type { Match } from '~/lib/mock-data';
import { useAuth } from '~/lib/auth-context';

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'live', label: 'Live' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'finished', label: 'Finished' },
];

export default function MatchesScreen() {
  const [tab, setTab] = useState('all');
  const [selected, setSelected] = useState<Match | null>(null);
  const { userPicks } = useAuth();

  const filtered = MATCHES.filter(m => {
    if (tab === 'live') return m.status === 'live';
    if (tab === 'upcoming') return m.status === 'upcoming';
    if (tab === 'finished') return m.status === 'finished';
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
    <PageContainer>
      <div className="matches-screen__header">
        <SectionHeader
          title="Matches"
          subtitle="FIFA World Cup 2026 · Group Stage"
        />
        <FilterTabs tabs={FILTER_TABS} active={tab} onChange={setTab} />
      </div>

      {filtered.length === 0 && (
        <div className="matches-screen__empty">No matches in this category</div>
      )}

      <div className="matches-screen__grid">
        {filtered.map(m => (
          <MatchCard
            key={m.id}
            match={m}
            onTap={() => setSelected(m)}
            userPick={userPicks[m.id]}
          />
        ))}
      </div>
    </PageContainer>
  );
}
