import './TeamMatches.css';
import { Link, useNavigate } from 'react-router';
import { useTranslation } from '~/hooks/useTranslation';
import PageContainer from './PageContainer';
import MatchCard from './MatchCard';
import { useData } from '~/lib/data-context';
import { useAuth } from '~/lib/auth-context';
import { TEAM_FULL } from '~/lib/mock-data';

interface Props {
  venue: string;
}

export default function VenueMatches({ venue }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { matches } = useData();
  const { userPicks } = useAuth();

  const venueMatches = matches
    .filter(m => m.venue === venue)
    .sort((a, b) => a.utcDate.localeCompare(b.utcDate));

  const sample = venueMatches[0];

  return (
    <PageContainer>
      <Link to="/matches" className="team-matches__back">{t('TEAM_MATCHES_BACK')}</Link>

      <div className="team-matches__header">
        <div className="team-matches__name">{venue}</div>
      </div>
      {sample?.venueCity && (
        <div className="team-matches__subtitle">
          {sample.venueCity}
          {sample.venueCountry && `, ${TEAM_FULL[sample.venueCountry] ?? sample.venueCountry}`}
        </div>
      )}

      {venueMatches.length === 0 ? (
        <div className="team-matches__empty">{t('TEAM_MATCHES_EMPTY')}</div>
      ) : (
        <div className="team-matches__grid">
          {venueMatches.map(m => (
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
