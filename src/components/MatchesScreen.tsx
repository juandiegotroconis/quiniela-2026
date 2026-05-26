import './MatchesScreen.css';
import { useState } from 'react';
import PageContainer from './PageContainer';
import Wc26Banner from './Wc26Banner';
import SectionHeader from './SectionHeader';
import FilterTabs from './FilterTabs';
import MatchCard from './MatchCard';
import MatchDetail from './MatchDetail';
import { useData } from '~/lib/data-context';
import type { Match } from '~/lib/types';
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
  const { matches, matchesLoading } = useData();

  const filtered = matches.filter(m => {
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
    <>
      <Wc26Banner />
      <PageContainer>
      <div className="matches-screen__header">
        <SectionHeader title="Matches" subtitle="FIFA World Cup 2026 · Group Stage" />
        <FilterTabs tabs={FILTER_TABS} active={tab} onChange={setTab} />
      </div>

      {matchesLoading && <div className="matches-screen__empty">Loading…</div>}

      {!matchesLoading && filtered.length === 0 && (
        <div className="matches-screen__empty">No matches in this category</div>
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
