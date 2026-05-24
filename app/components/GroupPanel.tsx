import './GroupPanel.css';
import GroupTable from './GroupTable';
import GroupMatchRow from './GroupMatchRow';
import { calcGroupStandings } from '~/lib/helpers';
import { MATCHES } from '~/lib/mock-data';
import { useAuth } from '~/lib/auth-context';

interface Props {
  groupId: string;
}

export default function GroupPanel({ groupId }: Props) {
  const { userPicks } = useAuth();
  const standings = calcGroupStandings(groupId, null);
  const groupMatches = MATCHES.filter(m => m.group === groupId).sort((a, b) => a.id - b.id);

  return (
    <div className="group-panel">
      <div className="group-panel__title">Group {groupId}</div>

      <GroupTable standings={standings} />

      <div className="group-panel__matches">
        <div className="group-panel__matches-heading">Matches</div>
        {groupMatches.map(m => (
          <GroupMatchRow key={m.id} match={m} userPick={userPicks[m.id]} />
        ))}
      </div>
    </div>
  );
}
