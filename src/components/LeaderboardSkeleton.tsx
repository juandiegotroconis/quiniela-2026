import './LeaderboardScreen.css';
import Skeleton from './Skeleton';

export default function LeaderboardSkeleton() {
  return (
    <>
      <div className="leaderboard__podium">
        {[1, 0, 2].map(i => (
          <div key={i} className="podium-card" style={{ width: i === 0 ? 140 : 110 }}>
            <Skeleton width={i === 0 ? 64 : 48} height={i === 0 ? 64 : 48} radius="50%" />
            <Skeleton width={60} height={14} />
            <Skeleton width={36} height={18} />
          </div>
        ))}
      </div>

      <div className="leaderboard__table">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="leaderboard__row">
            <Skeleton width={18} height={14} />
            <span />
            <div className="leaderboard__row-player">
              <Skeleton width={32} height={32} radius="50%" />
              <Skeleton width={100} height={14} />
            </div>
            <span />
            <Skeleton width={36} height={16} />
          </div>
        ))}
      </div>
    </>
  );
}
