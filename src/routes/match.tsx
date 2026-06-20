import { useParams, useNavigate, useSearchParams } from 'react-router';
import { useEffect, useState } from 'react';
import { useTranslation } from '~/hooks/useTranslation';
import PageContainer from '~/components/PageContainer';
import MatchDetail from '~/components/MatchDetail';
import MatchDetailSkeleton from '~/components/MatchDetailSkeleton';
import { useData } from '~/lib/data-context';
import { useAuth } from '~/lib/auth-context';
import type { UserPickEntry } from '~/lib/auth-context';

export default function MatchRoute() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const asUserId = searchParams.get('user');
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { matches, matchesLoading, getPicksForUser } = useData();
  const { user, userPicks, quinielaId } = useAuth();
  const [otherPicks, setOtherPicks] = useState<Record<number, UserPickEntry> | null>(null);

  const match = matches.find(m => m.id === Number(id));
  const viewingOther = !!asUserId && asUserId !== user?.id;

  useEffect(() => {
    if (!viewingOther || !quinielaId || !asUserId) {
      setOtherPicks(null);
      return;
    }
    setOtherPicks(null);
    let cancelled = false;
    getPicksForUser(asUserId, quinielaId)
      .then((picks) => {
        if (!cancelled) setOtherPicks(picks);
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [viewingOther, asUserId, quinielaId, getPicksForUser]);

  if (matchesLoading) {
    return (
      <PageContainer>
        <MatchDetailSkeleton />
      </PageContainer>
    );
  }

  if (!match) {
    return <PageContainer>{t('MATCH_NOT_FOUND')}</PageContainer>;
  }

  const userPick = viewingOther ? otherPicks?.[match.id] : userPicks[match.id];

  return (
    <PageContainer>
      <MatchDetail match={match} onBack={() => navigate(-1)} userPick={userPick} />
    </PageContainer>
  );
}
