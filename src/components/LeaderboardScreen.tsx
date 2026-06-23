import "./LeaderboardScreen.css";
import { useMemo, useState, useEffect } from "react";
import { useTranslation } from "~/hooks/useTranslation";
import { Link } from "react-router";
import PageContainer from "./PageContainer";
import Wc26Banner from "./Wc26Banner";
import MatchCorrectionBanner from "./MatchCorrectionBanner";
import SectionHeader from "./SectionHeader";
import PodiumCard from "./PodiumCard";
import LeaderboardSkeleton from "./LeaderboardSkeleton";
import StreakWidgets from "./StreakWidgets";
import TopScorersTab from "./TopScorersTab";
import Avatar from "./Avatar";
import PositionChange from "./PositionChange";
import Sparkline from "./Sparkline";
import { useData } from "~/lib/data-context";
import { useAuth } from "~/lib/auth-context";
import {
  fetchMemberHistory,
  fetchQuinielaName,
  fetchTopScorers,
  fetchTopScorerPicks,
} from "~/lib/queries";
import type { TopScorer, TopScorerPick } from "~/lib/types";

const RANK_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"];

export default function LeaderboardScreen() {
  const { members, membersLoading } = useData();
  const { user, quinielaId } = useAuth();
  const { t } = useTranslation();
  const [historyMap, setHistoryMap] = useState<Record<string, number[]>>({});
  const [quinielaName, setQuinielaName] = useState<string | null>(null);
  const [tab, setTab] = useState<'standings' | 'streaks' | 'topscorers'>('standings');
  const [topScorers, setTopScorers] = useState<TopScorer[]>([]);
  const [topScorerPicks, setTopScorerPicks] = useState<TopScorerPick[]>([]);
  const [topScorersLoading, setTopScorersLoading] = useState(true);

  useEffect(() => {
    if (!quinielaId) return;
    fetchMemberHistory(quinielaId).then(setHistoryMap).catch(console.error);
    fetchQuinielaName(quinielaId).then(setQuinielaName).catch(console.error);
    setTopScorersLoading(true);
    Promise.all([fetchTopScorers(), fetchTopScorerPicks(quinielaId)])
      .then(([scorers, picks]) => {
        setTopScorers(scorers);
        setTopScorerPicks(picks);
      })
      .catch(console.error)
      .finally(() => setTopScorersLoading(false));
  }, [quinielaId]);

  const leagueName = quinielaName ?? t('RANKINGS_FRIENDS_LEAGUE');

  // rank=0 means unranked (DB default); ties broken by join date (earlier = higher)
  const sorted = useMemo(() => {
    return [...members]
      .sort((a, b) => {
        const ra = a.rank || Infinity;
        const rb = b.rank || Infinity;
        if (ra !== rb) return ra - rb;
        const aJoined = a.joinedAt ?? "";
        const bJoined = b.joinedAt ?? "";
        return aJoined < bJoined ? -1 : aJoined > bJoined ? 1 : 0;
      })
      .map((m, i) => ({
        ...m,
        rank: m.rank || i + 1,
        history: historyMap[m.userId] ?? [],
      }));
  }, [members, historyMap]);

  const podium = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  const allTimeHot = sorted.reduce<(typeof sorted)[0] | null>(
    (best, m) => (!best || m.bestStreak > best.bestStreak ? m : best),
    null,
  );
  const allTimeCold = sorted.reduce<(typeof sorted)[0] | null>(
    (worst, m) => (!worst || m.worstStreak > worst.worstStreak ? m : worst),
    null,
  );
  const currentHot = sorted.reduce<(typeof sorted)[0] | null>(
    (best, m) => (!best || m.currentStreak > best.currentStreak ? m : best),
    null,
  );
  const currentCold = sorted.reduce<(typeof sorted)[0] | null>(
    (worst, m) => (!worst || m.currentStreak < worst.currentStreak ? m : worst),
    null,
  );

  // Podium order: 2nd (left), 1st (centre), 3rd (right) — fill from available
  const podiumSlots: ((typeof sorted)[0] | null)[] = [
    podium[1] ?? null,
    podium[0],
    podium[2] ?? null,
  ];

  if (membersLoading) {
    return (
      <PageContainer>
        <SectionHeader title={t('RANKINGS_TITLE')} subtitle={t('RANKINGS_LOADING')} />
        <LeaderboardSkeleton />
      </PageContainer>
    );
  }

  if (members.length === 0) {
    return (
      <PageContainer>
        <SectionHeader title={t('RANKINGS_TITLE')} subtitle={leagueName} />
        <div
          style={{
            padding: "2rem",
            textAlign: "center",
            color: "var(--fg-secondary)",
          }}
        >
          {t('RANKINGS_EMPTY')}
        </div>
      </PageContainer>
    );
  }

  return (
    <>
      <Wc26Banner />
      <PageContainer>
        <MatchCorrectionBanner />
        <SectionHeader
          title={t('RANKINGS_TITLE')}
          subtitle={`${leagueName} · ${sorted.length} ${sorted.length !== 1 ? t('RANKINGS_PLAYER_COUNT_PLURAL') : t('RANKINGS_PLAYER_COUNT_SINGULAR')}`}
        />

        <div className='leaderboard__tabs'>
          <button
            className={`leaderboard__tab${tab === 'standings' ? ' leaderboard__tab--active' : ''}`}
            onClick={() => setTab('standings')}
          >
            {t('RANKINGS_TAB_STANDINGS')}
          </button>
          <button
            className={`leaderboard__tab${tab === 'streaks' ? ' leaderboard__tab--active' : ''}`}
            onClick={() => setTab('streaks')}
          >
            {t('RANKINGS_TAB_STREAKS')}
          </button>
          <button
            className={`leaderboard__tab${tab === 'topscorers' ? ' leaderboard__tab--active' : ''}`}
            onClick={() => setTab('topscorers')}
          >
            {t('RANKINGS_TAB_TOP_SCORERS')}
          </button>
        </div>

        {tab === 'topscorers' ? (
          <TopScorersTab
            scorers={topScorers}
            picks={topScorerPicks}
            members={members}
            loading={topScorersLoading}
          />
        ) : tab === 'streaks' ? (
          <StreakWidgets
            currentHot={currentHot}
            currentCold={currentCold}
            allTimeHot={allTimeHot}
            allTimeCold={allTimeCold}
          />
        ) : (
          <>
            <div className='leaderboard__podium'>
              {podiumSlots.map((p, slotIdx) => {
                if (!p)
                  return <div key={slotIdx} className='leaderboard__podium-link' />;
                const isFirst = slotIdx === 1;
                const rankColor = RANK_COLORS[p.rank - 1];
                return (
                  <Link
                    key={p.userId}
                    to={`/player/${p.userId}`}
                    className='leaderboard__podium-link'
                  >
                    <PodiumCard
                      player={p}
                      rankColor={rankColor}
                      isFirst={isFirst}
                      isMe={p.userId === user?.id}
                    />
                  </Link>
                );
              })}
            </div>

            {rest.length > 0 && (
              <div className='leaderboard__table'>
                <div className='leaderboard__table-header'>
                  <span>#</span>
                  <span />
                  <span>{t('RANKINGS_PLAYER_LABEL')}</span>
                  <span className='leaderboard__table-header-trend'>{t('RANKINGS_TREND_LABEL')}</span>
                  <span className='leaderboard__table-header-pts'>{t('RANKINGS_PTS_LABEL')}</span>
                </div>

                {rest.map((p) => {
                  const isMe = p.userId === user?.id;
                  return (
                    <Link
                      key={p.userId}
                      to={`/player/${p.userId}`}
                      className={`leaderboard__row${isMe ? " leaderboard__row--me" : ""}`}
                    >
                      <span className='leaderboard__row-rank'>{p.rank}</span>
                      <PositionChange
                        current={p.rank}
                        previous={p.prevRank ?? p.rank}
                      />
                      <div className='leaderboard__row-player'>
                        <Avatar
                          name={p.displayName}
                          color={p.avatarColor}
                          size={32}
                        />
                        <span
                          className={`leaderboard__row-name${isMe ? " leaderboard__row-name--me" : ""}`}
                        >
                          {isMe ? t('PROFILE_YOU') : p.displayName}
                        </span>
                      </div>
                      <div className='leaderboard__row-trend'>
                        <Sparkline history={p.history} />
                      </div>
                      <span className='leaderboard__row-pts'>{p.pts}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}
      </PageContainer>
    </>
  );
}
