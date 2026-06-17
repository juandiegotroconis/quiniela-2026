import './GroupPanel.css';
import { useNavigate } from 'react-router';
import GroupTable from './GroupTable';
import { useTranslation } from '~/hooks/useTranslation';
import MatchCard from './MatchCard';
import { calcGroupStandings } from '~/lib/helpers';
import { useData } from '~/lib/data-context';
import { useAuth } from '~/lib/auth-context';
import type { UserPickEntry } from '~/lib/auth-context';

interface Props {
  groupId: string;
  picks?: Record<number, UserPickEntry> | null;
  userId?: string;
  projectWithPicks?: boolean;
}

export default function GroupPanel({ groupId, picks: externalPicks, userId, projectWithPicks }: Props) {
  const { userPicks } = useAuth();
  const { matches } = useData();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const picks = externalPicks !== undefined ? externalPicks : userPicks;
  const groupMatches = matches.filter(m => m.group === groupId).sort((a, b) => a.id - b.id);
  // Real standings by default — only actual results count. Callers that
  // explicitly want the "what-if" table (projecting a specific user's own
  // predictions onto unplayed matches) opt in via projectWithPicks.
  const standings = calcGroupStandings(groupId, matches, projectWithPicks ? picks : null);

  const goToMatch = (matchId: number) => {
    navigate(userId ? `/matches/${matchId}?user=${userId}` : `/matches/${matchId}`);
  };

  return (
    <div className="group-panel">
      <div className="group-panel__title">{t('GROUP_PANEL_GROUP_PREFIX')} {groupId}</div>

      <GroupTable standings={standings} />

      <div className="group-panel__matches-heading">{t('GROUP_PANEL_MATCHES_HEADING')}</div>
      <div className="group-panel__matches">
        {groupMatches.map(m => (
          <MatchCard key={m.id} match={m} onTap={() => goToMatch(m.id)} pick={picks?.[m.id]} />
        ))}
      </div>
    </div>
  );
}
