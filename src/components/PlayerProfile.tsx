import './PlayerProfile.css';
import { useState, useEffect } from 'react';
import { useTranslation } from '~/hooks/useTranslation';
import { Link } from 'react-router';
import PageContainer from './PageContainer';
import Avatar from './Avatar';
import PositionChange from './PositionChange';
import Sparkline from './Sparkline';
import { getPickResult } from '~/lib/helpers';
import { fetchSingleMemberHistory } from '~/lib/queries';
import { useAuth } from '~/lib/auth-context';
import { useData } from '~/lib/data-context';
import type { UserPickEntry } from '~/lib/auth-context';
import GroupPanel from './GroupPanel';
import GroupNav from './GroupNav';
import { GROUPS } from '~/lib/mock-data';

interface Props {
  userId: string;
}

export default function PlayerProfile({ userId }: Props) {
  const { user, quinielaId, userPicks: myPicks } = useAuth();
  const { matches, getMember, getPicksForUser } = useData();
  const { t } = useTranslation();
  const isMe = userId === user?.id;
  const [picks, setPicks] = useState<Record<number, UserPickEntry>>(isMe ? myPicks : {});
  const [memberHistory, setMemberHistory] = useState<number[]>([]);

  const member = getMember(userId);

  useEffect(() => {
    if (isMe) {
      setPicks(myPicks);
      return;
    }
    if (!quinielaId) return;
    getPicksForUser(userId, quinielaId).then(setPicks).catch(console.error);
  }, [userId, quinielaId, isMe, myPicks, getPicksForUser]);

  useEffect(() => {
    if (!quinielaId) return;
    fetchSingleMemberHistory(userId, quinielaId).then(setMemberHistory).catch(console.error);
  }, [userId, quinielaId]);

  if (!member) {
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

      <GroupNav groups={groupIds} />

      <div className="player-profile__groups">
        {groupIds.map(groupId => (
          <div key={groupId} id={`group-${groupId}`}>
            <GroupPanel groupId={groupId} picks={picks} />
          </div>
        ))}
      </div>
    </PageContainer>
  );
}
