import './MatchesScreen.css';
import { useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { useTranslation } from '~/hooks/useTranslation';
import PageContainer from './PageContainer';
import Wc26Banner from './Wc26Banner';
import SectionHeader from './SectionHeader';
import MatchCard from './MatchCard';
import MatchDetail from './MatchDetail';
import MatchFiltersDrawer from './MatchFiltersDrawer';
import type { FilterOption } from './MatchFiltersDrawer';
import { useData } from '~/lib/data-context';
import { getStageLabelKey, formatMatchDate, KNOCKOUT_STAGE_ORDER } from '~/lib/helpers';
import type { Match } from '~/lib/types';
import { useAuth } from '~/lib/auth-context';


function localDateKey(utcDate: string): string {
  const d = new Date(utcDate);
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

// Last day of the WC2026 tournament (the final) — upper bound for the date filter.
const WC_FINAL_DATE = '2026-07-19';

export default function MatchesScreen() {
  const [tab, setTab] = useState('all');
  const [stage, setStage] = useState('group');
  const [group, setGroup] = useState('all');
  const [knockoutStage, setKnockoutStage] = useState('all');
  const [date, setDate] = useState('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState<Match | null>(null);
  const { userPicks } = useAuth();
  const { matches, matchesLoading } = useData();
  const { t, language } = useTranslation();

  const STATUS_OPTIONS: FilterOption[] = [
    { id: 'all', label: t('MATCHES_FILTER_ALL') },
    { id: 'live', label: t('MATCHES_FILTER_LIVE') },
    { id: 'upcoming', label: t('MATCHES_FILTER_UPCOMING') },
    { id: 'finished', label: t('MATCHES_FILTER_FINISHED') },
  ];

  const STAGE_OPTIONS: FilterOption[] = [
    { id: 'group', label: t('MATCHES_STAGE_GROUP') },
    { id: 'knockout', label: t('MATCHES_STAGE_KNOCKOUT') },
  ];

  const groups = useMemo(() => {
    const seen = new Set<string>();
    for (const m of matches) if (m.stage === 'GROUP_STAGE' && m.group) seen.add(m.group);
    return [...seen].sort();
  }, [matches]);

  const knockoutStages = useMemo(() => {
    const seen = new Set<string>();
    for (const m of matches) if (m.stage !== 'GROUP_STAGE') seen.add(m.stage);
    return KNOCKOUT_STAGE_ORDER.filter(s => seen.has(s));
  }, [matches]);

  const groupOptions: FilterOption[] = [
    { id: 'all', label: t('MATCHES_GROUP_ALL') },
    ...groups.map(g => ({ id: g, label: `${t('MATCHES_GROUP_PREFIX')} ${g}` })),
  ];

  const knockoutStageOptions: FilterOption[] = [
    { id: 'all', label: t('MATCHES_KNOCKOUT_ALL') },
    ...knockoutStages.map(s => {
      const labelKey = getStageLabelKey(s);
      return { id: s, label: labelKey ? t(labelKey) : s };
    }),
  ];

  const handleStageChange = (next: string) => {
    setStage(next);
    setGroup('all');
    setKnockoutStage('all');
  };

  const clearAllFilters = () => {
    setTab('all');
    setStage('group');
    setGroup('all');
    setKnockoutStage('all');
    setDate('all');
  };

  const activeFilters: { key: string; label: string; onRemove: () => void }[] = [];
  if (tab !== 'all') {
    const opt = STATUS_OPTIONS.find(o => o.id === tab);
    if (opt) activeFilters.push({ key: 'status', label: opt.label, onRemove: () => setTab('all') });
  }
  if (stage === 'knockout') {
    activeFilters.push({ key: 'stage', label: t('MATCHES_STAGE_KNOCKOUT'), onRemove: () => handleStageChange('group') });
  }
  if (stage === 'group' && group !== 'all') {
    activeFilters.push({ key: 'group', label: `${t('MATCHES_GROUP_PREFIX')} ${group}`, onRemove: () => setGroup('all') });
  }
  if (stage === 'knockout' && knockoutStage !== 'all') {
    const labelKey = getStageLabelKey(knockoutStage);
    activeFilters.push({ key: 'round', label: labelKey ? t(labelKey) : knockoutStage, onRemove: () => setKnockoutStage('all') });
  }
  if (date !== 'all') {
    activeFilters.push({ key: 'date', label: formatMatchDate(`${date}T00:00:00`, language), onRemove: () => setDate('all') });
  }

  const firstMatchDate = useMemo(() => {
    let min = '';
    for (const m of matches) {
      if (!m.utcDate) continue;
      const key = localDateKey(m.utcDate);
      if (!min || key < min) min = key;
    }
    return min || '2026-06-11';
  }, [matches]);

  const filtered = matches.filter(m => {
    if (tab === 'live' && m.status !== 'live') return false;
    if (tab === 'upcoming' && m.status !== 'upcoming') return false;
    if (tab === 'finished' && m.status !== 'finished') return false;
    if (stage === 'group') {
      if (m.stage !== 'GROUP_STAGE') return false;
      if (group !== 'all' && m.group !== group) return false;
    } else {
      if (m.stage === 'GROUP_STAGE') return false;
      if (knockoutStage !== 'all' && m.stage !== knockoutStage) return false;
    }
    if (date !== 'all' && localDateKey(m.utcDate) !== date) return false;
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
        <button className="matches-screen__filters-btn" onClick={() => setFiltersOpen(true)}>
          <Icon icon="mdi:filter-variant" width={18} />
          {t('MATCHES_FILTERS_BUTTON')}
          {activeFilters.length > 0 && (
            <span className="matches-screen__filters-badge">{activeFilters.length}</span>
          )}
        </button>
      </div>

      {activeFilters.length > 0 && (
        <div className="matches-screen__active-filters">
          {activeFilters.map(f => (
            <button key={f.key} className="matches-screen__active-chip" onClick={f.onRemove}>
              {f.label}
              <Icon icon="mdi:close" width={14} />
            </button>
          ))}
        </div>
      )}

      {matchesLoading && <div className="matches-screen__empty">{t('MATCHES_LOADING')}</div>}

      {!matchesLoading && filtered.length === 0 && (
        <div className="matches-screen__empty">{t('MATCHES_EMPTY')}</div>
      )}

      <div className="matches-screen__grid">
        {filtered.map(m => (
          <MatchCard key={m.id} match={m} onTap={() => setSelected(m)} />
        ))}
      </div>

      {filtersOpen && (
        <MatchFiltersDrawer
          onClose={() => setFiltersOpen(false)}
          onClearAll={clearAllFilters}
          status={tab}
          onStatusChange={setTab}
          statusOptions={STATUS_OPTIONS}
          stage={stage}
          onStageChange={handleStageChange}
          stageOptions={STAGE_OPTIONS}
          group={group}
          onGroupChange={setGroup}
          groupOptions={groupOptions}
          knockoutStage={knockoutStage}
          onKnockoutStageChange={setKnockoutStage}
          knockoutStageOptions={knockoutStageOptions}
          date={date}
          onDateChange={setDate}
          dateMin={firstMatchDate}
          dateMax={WC_FINAL_DATE}
        />
      )}
    </PageContainer>
    </>
  );
}
