import './GroupTable.css';
import { Link } from 'react-router';
import TeamFlag from './TeamFlag';
import { useTranslation } from '~/hooks/useTranslation';
import type { TeamStanding } from '~/lib/helpers';

interface Props {
  standings: TeamStanding[];
}

const QUALIFY = 2;
const STATS: (keyof TeamStanding)[] = ['mp', 'w', 'd', 'l', 'gf', 'ga'];
const HEADERS = ['MP', 'W', 'D', 'L', 'GF', 'GA'];
const HIDE_SM = new Set(['GF', 'GA', 'gf', 'ga']);

export default function GroupTable({ standings }: Props) {
  const { t } = useTranslation();
  return (
    <div className="group-table">
      <div className="group-table__header">
        <span>#</span>
        <span>{t('GROUP_TABLE_HEADER_TEAM')}</span>
        {HEADERS.map(h => (
          <span
            key={h}
            className={`group-table__col-center${HIDE_SM.has(h) ? ' group-table__col--hide-sm' : ''}`}
          >
            {h}
          </span>
        ))}
        <span className="group-table__col-center group-table__header-pts">{t('GROUP_TABLE_HEADER_PTS')}</span>
      </div>

      {standings.map((standing, i) => {
        const qualify = i < QUALIFY;
        return (
          <div
            key={standing.team}
            className={`group-table__row${qualify ? ' group-table__row--qualify' : ''}`}
          >
            <span className={`group-table__pos${qualify ? ' group-table__pos--qualify' : ''}`}>
              {i + 1}
            </span>
            <Link to={`/teams/${standing.team}`} className="group-table__team">
              <TeamFlag code={standing.team} size={24} />
              <span className="group-table__team-name">
                {standing.team}
                {standing.projected && <span className="group-table__projected">*</span>}
              </span>
            </Link>
            {STATS.map(k => (
              <span
                key={String(k)}
                className={`group-table__stat${HIDE_SM.has(String(k)) ? ' group-table__col--hide-sm' : ''}`}
              >
                {standing[k] as number}
              </span>
            ))}
            <span className="group-table__pts">{standing.pts}</span>
          </div>
        );
      })}

      {standings.some(s => s.projected) && (
        <div className="group-table__projected-note">{t('GROUP_TABLE_PROJECTED_NOTE')}</div>
      )}
    </div>
  );
}
