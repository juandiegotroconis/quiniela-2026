import './LeaderboardScreen.css';
import { Link } from 'react-router';
import PageContainer from './PageContainer';
import SectionHeader from './SectionHeader';
import PodiumCard from './PodiumCard';
import Avatar from './Avatar';
import PositionChange from './PositionChange';
import Sparkline from './Sparkline';
import { useData } from '~/lib/data-context';
import { useAuth } from '~/lib/auth-context';

const RANK_COLORS = ['#C8A94E', '#B0B0B0', '#CD7F32'];

export default function LeaderboardScreen() {
  const { members, membersLoading } = useData();
  const { user } = useAuth();

  if (membersLoading) {
    return (
      <PageContainer>
        <SectionHeader title="Rankings" subtitle="Loading…" />
      </PageContainer>
    );
  }

  if (members.length === 0) {
    return (
      <PageContainer>
        <SectionHeader title="Rankings" subtitle="Friends League" />
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--fg-secondary)' }}>
          No players yet — be the first to join!
        </div>
      </PageContainer>
    );
  }

  // Members with null rank get sorted to the end; assign display rank by index
  const sorted = [...members].sort((a, b) => {
    if (a.rank == null && b.rank == null) return 0;
    if (a.rank == null) return 1;
    if (b.rank == null) return -1;
    return a.rank - b.rank;
  }).map((m, i) => ({ ...m, rank: m.rank ?? i + 1 }));

  const podium = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  // Podium order: 2nd (left), 1st (centre), 3rd (right) — fill from available
  const podiumSlots: (typeof sorted[0] | null)[] = [
    podium[1] ?? null,
    podium[0],
    podium[2] ?? null,
  ];

  return (
    <PageContainer>
      <SectionHeader title="Rankings" subtitle={`Friends League · ${sorted.length} player${sorted.length !== 1 ? 's' : ''}`} />

      <div className="leaderboard__podium">
        {podiumSlots.map((p, slotIdx) => {
          if (!p) return <div key={slotIdx} className="leaderboard__podium-link" />;
          const isFirst = slotIdx === 1;
          const rankColor = RANK_COLORS[slotIdx];
          return (
            <Link key={p.userId} to={`/player/${p.userId}`} className="leaderboard__podium-link">
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
        <div className="leaderboard__table">
          <div className="leaderboard__table-header">
            <span>#</span>
            <span />
            <span>Player</span>
            <span className="leaderboard__table-header-trend">Trend</span>
            <span className="leaderboard__table-header-pts">Pts</span>
          </div>

          {rest.map(p => {
            const isMe = p.userId === user?.id;
            return (
              <Link
                key={p.userId}
                to={`/player/${p.userId}`}
                className={`leaderboard__row${isMe ? ' leaderboard__row--me' : ''}`}
              >
                <span className="leaderboard__row-rank">{p.rank}</span>
                <PositionChange current={p.rank} previous={p.prevRank ?? p.rank} />
                <div className="leaderboard__row-player">
                  <Avatar name={p.displayName} color={p.avatarColor} size={32} />
                  <span className={`leaderboard__row-name${isMe ? ' leaderboard__row-name--me' : ''}`}>
                    {isMe ? 'You' : p.displayName}
                  </span>
                </div>
                <div className="leaderboard__row-trend">
                  <Sparkline history={p.history} />
                </div>
                <span className="leaderboard__row-pts">{p.pts}</span>
              </Link>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
