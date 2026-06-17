import Skeleton from './Skeleton';

export default function PlayerProfileSkeleton() {
  return (
    <>
      <div className="player-profile__header">
        <Skeleton width={64} height={64} radius="50%" />
        <div className="player-profile__header-info">
          <Skeleton width={160} height={24} />
          <div className="player-profile__rank-row">
            <Skeleton width={120} height={16} />
          </div>
          <div className="player-profile__sparkline">
            <Skeleton width="100%" height={32} />
          </div>
        </div>
      </div>

      <div className="player-profile__stats">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="player-profile__stat-card">
            <Skeleton width={32} height={24} />
            <div style={{ marginTop: 6 }}>
              <Skeleton width={60} height={11} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
