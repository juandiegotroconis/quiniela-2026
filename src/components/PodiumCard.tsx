import './PodiumCard.css';
import Avatar from './Avatar';
import PositionChange from './PositionChange';
import type { Member } from '~/lib/types';

interface Props {
  player: Member;
  rankColor: string;
  isFirst?: boolean;
  isMe?: boolean;
}

export default function PodiumCard({ player, rankColor, isFirst, isMe }: Props) {
  const sz = isFirst ? 64 : 48;
  return (
    <div
      className={`podium-card${isFirst ? '' : player.rank === 2 ? ' podium-card--second' : ' podium-card--third'}`}
      style={{ width: isFirst ? 140 : 110 }}
    >
      <div className="podium-card__avatar-wrap">
        <Avatar name={player.displayName} color={player.avatarColor} size={sz} />
        <div
          className="podium-card__rank-badge"
          style={{ background: rankColor, color: '#fff' }}
        >
          {player.rank}
        </div>
      </div>

      <span className="podium-card__name">
        {isMe ? 'You' : player.displayName.split(' ')[0]}
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

      <PositionChange current={player.rank} previous={player.prevRank ?? player.rank} />
    </div>
  );
}
