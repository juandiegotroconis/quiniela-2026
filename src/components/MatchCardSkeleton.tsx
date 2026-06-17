import './MatchCard.css';
import Skeleton from './Skeleton';

export default function MatchCardSkeleton() {
  return (
    <div className="match-card">
      <div className="match-card__header">
        <Skeleton width={48} height={11} />
        <Skeleton width={36} height={11} />
      </div>
      <div className="match-card__score-row">
        <div className="match-card__team">
          <Skeleton width={28} height={28} radius="50%" />
          <Skeleton width={40} height={12} />
        </div>
        <Skeleton width={50} height={26} />
        <div className="match-card__team">
          <Skeleton width={28} height={28} radius="50%" />
          <Skeleton width={40} height={12} />
        </div>
      </div>
    </div>
  );
}
