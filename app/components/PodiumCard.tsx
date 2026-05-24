import './PodiumCard.css';
import Avatar from './Avatar';
import PositionChange from './PositionChange';
import type { Player } from '~/lib/mock-data';
import { ME_ID } from '~/lib/mock-data';

interface Props {
  player: Player;
  rankColor: string;
  isFirst?: boolean;
}

export default function PodiumCard({ player, rankColor, isFirst }: Props) {
  const sz = isFirst ? 64 : 48;
  return (
    <div
      className={`podium-card${isFirst ? '' : player.rank === 2 ? ' podium-card--second' : ' podium-card--third'}`}
      style={{ width: isFirst ? 140 : 110 }}
    >
      <div className="podium-card__avatar-wrap">
        <Avatar name={player.name} index={player.id - 1} size={sz} />
        <div
          className="podium-card__rank-badge"
          style={{ background: rankColor }}
        >
          {player.rank}
        </div>
      </div>

      <span className="podium-card__name">
        {player.id === ME_ID ? 'You' : player.name.split(' ')[0]}
      </span>

      <div className="podium-card__pts">
        <span
          className="podium-card__pts-num"
          style={{ fontSize: isFirst ? 26 : 20, color: rankColor }}
        >
          {player.pts}
        </span>
        <span className="podium-card__pts-label">pts</span>
      </div>

      <PositionChange current={player.rank} previous={player.prevRank} />
    </div>
  );
}
