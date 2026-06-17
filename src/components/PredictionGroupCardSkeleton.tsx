import './PredictionGroupCard.css';
import Skeleton from './Skeleton';

export default function PredictionGroupCardSkeleton() {
  return (
    <div className="pred-group-card">
      <div className="pred-group-card__score">
        <Skeleton width={50} height={28} />
      </div>
      <div className="pred-group-card__players">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="pred-group-card__player">
            <Skeleton width={28} height={28} radius="50%" />
            <Skeleton width={36} height={10} />
          </div>
        ))}
      </div>
    </div>
  );
}
