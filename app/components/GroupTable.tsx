import './GroupTable.css';
import TeamFlag from './TeamFlag';
import type { TeamStanding } from '~/lib/helpers';

interface Props {
  standings: TeamStanding[];
}

const QUALIFY = 2;
const STATS: (keyof TeamStanding)[] = ['mp', 'w', 'd', 'l', 'gf', 'ga'];

export default function GroupTable({ standings }: Props) {
  return (
    <div className="group-table">
      <div className="group-table__header">
        <span>#</span>
        <span>Team</span>
        {['MP', 'W', 'D', 'L', 'GF', 'GA'].map(h => (
          <span key={h} className="group-table__col-center">{h}</span>
        ))}
        <span className="group-table__col-center group-table__header-pts">Pts</span>
      </div>

      {standings.map((t, i) => {
        const qualify = i < QUALIFY;
        return (
          <div
            key={t.team}
            className={`group-table__row${qualify ? ' group-table__row--qualify' : ''}`}
          >
            <span className={`group-table__pos${qualify ? ' group-table__pos--qualify' : ''}`}>
              {i + 1}
            </span>
            <div className="group-table__team">
              <TeamFlag code={t.team} size={24} />
              <span className="group-table__team-name">{t.team}</span>
            </div>
            {STATS.map(k => (
              <span key={String(k)} className="group-table__stat">
                {t[k] as number}
              </span>
            ))}
            <span className="group-table__pts">{t.pts}</span>
          </div>
        );
      })}
    </div>
  );
}
