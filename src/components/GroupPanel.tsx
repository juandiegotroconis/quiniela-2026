import './GroupPanel.css';
import GroupTable from './GroupTable';
import { useTranslation } from '~/hooks/useTranslation';
import GroupMatchRow from './GroupMatchRow';
import { calcGroupStandings } from '~/lib/helpers';
import { useData } from '~/lib/data-context';
import { useAuth } from '~/lib/auth-context';
import type { UserPickEntry } from '~/lib/auth-context';

interface Props {
  groupId: string;
  picks?: Record<number, UserPickEntry> | null;
}

export default function GroupPanel({ groupId, picks: externalPicks }: Props) {
  const { userPicks } = useAuth();
  const { matches } = useData();
  const { t } = useTranslation();
  const picks = externalPicks !== undefined ? externalPicks : userPicks;
  const groupMatches = matches.filter(m => m.group === groupId).sort((a, b) => a.id - b.id);
  const standings = calcGroupStandings(groupId, matches, picks);

  return (
    <div className="group-panel">
      <div className="group-panel__title">{t('GROUP_PANEL_GROUP_PREFIX')} {groupId}</div>

      <GroupTable standings={standings} />

      <div className="group-panel__matches">
        <div className="group-panel__matches-heading">{t('GROUP_PANEL_MATCHES_HEADING')}</div>
        {groupMatches.map(m => (
          <GroupMatchRow key={m.id} match={m} userPick={picks?.[m.id]} />
        ))}
      </div>
    </div>
  );
}
