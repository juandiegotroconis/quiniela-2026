import './GroupPanel.css';
import GroupTable from './GroupTable';
import GroupMatchRow from './GroupMatchRow';
import { calcGroupStandings } from '~/lib/helpers';
import { useData } from '~/lib/data-context';
import { useAuth } from '~/lib/auth-context';

interface Props {
  groupId: string;
}

export default function GroupPanel({ groupId }: Props) {
  const { userPicks } = useAuth();
  const { matches } = useData();
  const groupMatches = matches.filter(m => m.group === groupId).sort((a, b) => a.id - b.id);
  const standings = calcGroupStandings(groupId, matches, userPicks);

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
