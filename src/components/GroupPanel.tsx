import './GroupPanel.css';
import { useState } from 'react';
import GroupTable from './GroupTable';
import { useTranslation } from '~/hooks/useTranslation';
import MatchCard from './MatchCard';
import MatchDetail from './MatchDetail';
import { calcGroupStandings } from '~/lib/helpers';
import { useData } from '~/lib/data-context';
import { useAuth } from '~/lib/auth-context';
import type { UserPickEntry } from '~/lib/auth-context';
import type { Match } from '~/lib/types';

interface Props {
  groupId: string;
  picks?: Record<number, UserPickEntry> | null;
}

export default function GroupPanel({ groupId, picks: externalPicks }: Props) {
  const { userPicks } = useAuth();
  const { matches } = useData();
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Match | null>(null);
  const picks = externalPicks !== undefined ? externalPicks : userPicks;
  const groupMatches = matches.filter(m => m.group === groupId).sort((a, b) => a.id - b.id);
  const standings = calcGroupStandings(groupId, matches, picks);

  if (selected) {
    return (
      <MatchDetail
        match={selected}
        onBack={() => setSelected(null)}
        userPick={picks?.[selected.id]}
      />
    );
  }

  return (
    <div className="group-panel">
      <div className="group-panel__title">{t('GROUP_PANEL_GROUP_PREFIX')} {groupId}</div>

      <GroupTable standings={standings} />

      <div className="group-panel__matches-heading">{t('GROUP_PANEL_MATCHES_HEADING')}</div>
      <div className="group-panel__matches">
        {groupMatches.map(m => (
          <MatchCard key={m.id} match={m} onTap={() => setSelected(m)} />
        ))}
      </div>
    </div>
  );
}
