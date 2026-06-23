import './PlayerProfile.css';
import { useState, useEffect } from 'react';
import { useTranslation } from '~/hooks/useTranslation';
import { Link } from 'react-router';
import PageContainer from './PageContainer';
import Avatar from './Avatar';
import PositionChange from './PositionChange';
import Sparkline from './Sparkline';
import MatchPickList from './MatchPickList';
import { getPickResult } from '~/lib/helpers';
import { fetchSingleMemberHistory, fetchUserTopScorer } from '~/lib/queries';
import { useAuth } from '~/lib/auth-context';
import { useData } from '~/lib/data-context';
import type { UserPickEntry } from '~/lib/auth-context';
import GroupPanel from './GroupPanel';
import GroupNav from './GroupNav';
import TopScorerPicker from './TopScorerPicker';
import PlayerProfileSkeleton from './PlayerProfileSkeleton';
import { GROUPS } from '~/lib/mock-data';
import type { TopScorerSuggestion } from '~/lib/mock-data';

interface Props {
  userId: string;
}

export default function PlayerProfile({ userId }: Props) {
  const { user, quinielaId, userPicks: myPicks, topScorer: myTopScorer } = useAuth();
  const { matches, membersLoading, getMember, getPicksForUser } = useData();
  const { t } = useTranslation();
  const isMe = userId === user?.id;
  const [picks, setPicks] = useState<Record<number, UserPickEntry>>(isMe ? myPicks : {});
  const [memberHistory, setMemberHistory] = useState<number[]>([]);
  const [topScorer, setTopScorer] = useState<TopScorerSuggestion | null>(isMe ? myTopScorer : null);
  const [standingsView, setStandingsView] = useState<'real' | 'predicted'>('real');
  const [mainView, setMainView] = useState<'matches' | 'groups'>('matches');

  const member = getMember(userId);

  useEffect(() => {
    if (isMe) {
      setPicks(myPicks);
      return;
    }
    if (!quinielaId) return;
    setPicks({});
    let cancelled = false;
    getPicksForUser(userId, quinielaId)
      .then((p) => {
        if (!cancelled) setPicks(p);
      })
      .catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [userId, quinielaId, isMe, myPicks, getPicksForUser]);

  useEffect(() => {
    if (!quinielaId) return;
    fetchSingleMemberHistory(userId, quinielaId).then(setMemberHistory).catch(console.error);
  }, [userId, quinielaId]);

  useEffect(() => {
    if (isMe) {
      setTopScorer(myTopScorer);
      return;
    }
    if (!quinielaId) return;
    fetchUserTopScorer(userId, quinielaId).then(setTopScorer).catch(console.error);
  }, [userId, quinielaId, isMe, myTopScorer]);

  if (!member) {
    if (membersLoading) {
      return (
        <PageContainer>
          <Link to="/rankings" className="player-profile__back">{t('PLAYER_PROFILE_BACK')}</Link>
          <PlayerProfileSkeleton />
        </PageContainer>
      );
    }
    return (
      <PageContainer>
        <Link to="/rankings" className="player-profile__back">{t('PLAYER_PROFILE_BACK')}</Link>
        <div className="player-profile__not-found">{t('PLAYER_PROFILE_NOT_FOUND')}</div>
      </PageContainer>
    );
  }

  const displayName = isMe ? (user?.name ?? t('PROFILE_YOU')) : member.displayName;
  const groupIds = Object.keys(GROUPS);

  const finishedMatches = matches.filter(m => {
    if (m.status !== 'finished') return false;
    const p = picks[m.id];
    return p && p.pickA !== '' && p.pickB !== '';
  });

  const exactCount = finishedMatches.filter(m => {
    const p = picks[m.id];
    return getPickResult(m, parseInt(String(p.pickA)), parseInt(String(p.pickB))) === 'exact';
  }).length;

  const winnerCount = finishedMatches.filter(m => {
    const p = picks[m.id];
    return getPickResult(m, parseInt(String(p.pickA)), parseInt(String(p.pickB))) === 'tendency';
  }).length;

  const missed = finishedMatches.length - exactCount - winnerCount;
  const accuracy = finishedMatches.length > 0
    ? Math.round(((exactCount + winnerCount) / finishedMatches.length) * 100) + '%'
    : '—';

  const stats = [
    { label: t('PLAYER_PROFILE_STAT_EXACT'), value: exactCount, color: 'var(--color-green)' },
    { label: t('PLAYER_PROFILE_STAT_WINNER'), value: winnerCount, color: 'var(--color-gold)' },
    { label: t('PLAYER_PROFILE_STAT_MISSED'), value: missed, color: 'var(--color-error)' },
    { label: t('PLAYER_PROFILE_STAT_ACCURACY'), value: accuracy, color: 'var(--color-info)' },
  ];

  return (
    <PageContainer>
      <Link to="/rankings" className="player-profile__back">{t('PLAYER_PROFILE_BACK')}</Link>

      <div className="player-profile__header">
        <Avatar name={displayName} color={member.avatarColor} size={64} />
        <div className="player-profile__header-info">
          <div className="player-profile__name">{displayName}</div>
          <div className="player-profile__rank-row">
            <span className="player-profile__rank-label">
              {t('PLAYER_PROFILE_RANK_LABEL')} <span className="player-profile__rank-num">#{member.rank}</span>
            </span>
            <PositionChange current={member.rank} previous={member.prevRank ?? member.rank} />
            <span className="player-profile__pts">{member.pts} pts</span>
            {member.currentStreak !== 0 && (
              <span className="player-profile__streak">
                {member.currentStreak > 0 ? '🔥' : '🥶'} {Math.abs(member.currentStreak)} {t('RANKINGS_STREAK_IN_A_ROW')}
              </span>
            )}
          </div>
          <div className="player-profile__sparkline">
            <Sparkline history={memberHistory} />
          </div>
        </div>
      </div>

      <div className="player-profile__stats">
        {stats.map((s, i) => (
          <div key={i} className="player-profile__stat-card">
            <div className="player-profile__stat-value" style={{ color: s.color }}>
              {s.value}
            </div>
            <div className="player-profile__stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {topScorer && (
        <div className="player-profile__scorer">
          <div className="player-profile__scorer-heading">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--color-gold)">
              <path d="M7.5 21H2V9h5.5v12zm7.25-18h-5.5v18h5.5V3zM22 11h-5.5v10H22V11z" />
            </svg>
            {t('PROFILE_READONLY_TOP_SCORER_HEADING')}
          </div>
          <TopScorerPicker value={topScorer} disabled />
        </div>
      )}

      <div className="player-profile__view-tabs">
        <button
          className={`player-profile__view-tab${mainView === 'matches' ? ' player-profile__view-tab--active' : ''}`}
          onClick={() => setMainView('matches')}
        >
          {t('PLAYER_PROFILE_MAIN_TAB_MATCHES')}
        </button>
        <button
          className={`player-profile__view-tab${mainView === 'groups' ? ' player-profile__view-tab--active' : ''}`}
          onClick={() => setMainView('groups')}
        >
          {t('PLAYER_PROFILE_MAIN_TAB_GROUPS')}
        </button>
      </div>

      {mainView === 'matches' ? (
        <MatchPickList
          matches={matches}
          picks={picks}
          pickLabelKey={isMe ? 'PROFILE_READONLY_YOUR_PICK' : 'MATCH_PICK_LIST_PICK_LABEL'}
        />
      ) : (
        <>
          <div className="player-profile__view-tabs">
            <button
              className={`player-profile__view-tab${standingsView === 'real' ? ' player-profile__view-tab--active' : ''}`}
              onClick={() => setStandingsView('real')}
            >
              {t('PLAYER_PROFILE_VIEW_REAL')}
            </button>
            <button
              className={`player-profile__view-tab${standingsView === 'predicted' ? ' player-profile__view-tab--active' : ''}`}
              onClick={() => setStandingsView('predicted')}
            >
              {t('PLAYER_PROFILE_VIEW_PREDICTED')}
            </button>
          </div>

          <GroupNav groups={groupIds} />

          <div className="player-profile__groups">
            {groupIds.map(groupId => (
              <div key={groupId} id={`group-${groupId}`}>
                <GroupPanel
                  groupId={groupId}
                  picks={picks}
                  userId={userId}
                  projectWithPicks={standingsView === 'predicted'}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </PageContainer>
  );
}
