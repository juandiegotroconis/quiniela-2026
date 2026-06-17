import './TeamMatches.css';
import { Link, useNavigate } from 'react-router';
import { useTranslation } from '~/hooks/useTranslation';
import PageContainer from './PageContainer';
import TeamFlag from './TeamFlag';
import MatchCard from './MatchCard';
import { useData } from '~/lib/data-context';
import { useAuth } from '~/lib/auth-context';
import { TEAM_FULL } from '~/lib/mock-data';

interface Props {
  code: string;
}

export default function TeamMatches({ code }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { matches } = useData();
  const { userPicks } = useAuth();

  const teamMatches = matches
    .filter(m => m.teamA === code || m.teamB === code)
    .sort((a, b) => a.utcDate.localeCompare(b.utcDate));

  return (
    <PageContainer>
      <Link to="/matches" className="team-matches__back">{t('TEAM_MATCHES_BACK')}</Link>

      <div className="team-matches__header">
        <TeamFlag code={code} size={48} />
        <div className="team-matches__name">{TEAM_FULL[code] ?? code}</div>
      </div>

      {teamMatches.length === 0 ? (
        <div className="team-matches__empty">{t('TEAM_MATCHES_EMPTY')}</div>
      ) : (
        <div className="team-matches__grid">
          {teamMatches.map(m => (
            <MatchCard
              key={m.id}
              match={m}
              onTap={() => navigate(`/matches/${m.id}`)}
              pick={userPicks[m.id]}
            />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
