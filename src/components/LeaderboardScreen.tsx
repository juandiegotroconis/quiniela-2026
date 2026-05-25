import './LeaderboardScreen.css';
import { Link } from 'react-router';
import PageContainer from './PageContainer';
import SectionHeader from './SectionHeader';
import PodiumCard from './PodiumCard';
import Avatar from './Avatar';
import PositionChange from './PositionChange';
import Sparkline from './Sparkline';
import { PLAYERS, ME_ID } from '~/lib/mock-data';

const RANK_COLORS = ['#C8A94E', '#B0B0B0', '#CD7F32'];

export default function LeaderboardScreen() {
  const sorted = [...PLAYERS].sort((a, b) => a.rank - b.rank);

  return (
    <PageContainer>
      <SectionHeader title="Rankings" subtitle="Friends League · 15 players" />

      <div className="leaderboard__podium">
        <Link to={`/player/${sorted[1].id}`} className="leaderboard__podium-link">
          <PodiumCard player={sorted[1]} rankColor={RANK_COLORS[1]} />
        </Link>
        <Link to={`/player/${sorted[0].id}`} className="leaderboard__podium-link">
          <PodiumCard player={sorted[0]} rankColor={RANK_COLORS[0]} isFirst />
        </Link>
        <Link to={`/player/${sorted[2].id}`} className="leaderboard__podium-link">
          <PodiumCard player={sorted[2]} rankColor={RANK_COLORS[2]} />
        </Link>
      </div>

      <div className="leaderboard__table">
        <div className="leaderboard__table-header">
          <span>#</span>
          <span />
          <span>Player</span>
          <span className="leaderboard__table-header-trend">Trend</span>
          <span className="leaderboard__table-header-pts">Pts</span>
        </div>

        {sorted.slice(3).map(p => {
          const isMe = p.id === ME_ID;
          return (
            <Link
              key={p.id}
              to={`/player/${p.id}`}
              className={`leaderboard__row${isMe ? ' leaderboard__row--me' : ''}`}
            >
              <span className="leaderboard__row-rank">{p.rank}</span>
              <PositionChange current={p.rank} previous={p.prevRank} />
              <div className="leaderboard__row-player">
                <Avatar name={p.name} index={p.id - 1} size={32} />
                <span className={`leaderboard__row-name${isMe ? ' leaderboard__row-name--me' : ''}`}>
                  {isMe ? 'You' : p.name}
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
    </PageContainer>
  );
}
