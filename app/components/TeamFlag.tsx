import './TeamFlag.css';
import { getTeamColor } from '~/lib/helpers';

interface Props {
  code: string;
  size?: number;
}

export default function TeamFlag({ code, size = 32 }: Props) {
  const bg = getTeamColor(code);
  const h = Math.round(size * 0.72);
  return (
    <div
      className={`team-flag${size < 30 ? ' team-flag--sm' : ''}`}
      style={{ width: size, height: h, background: bg }}
    >
      {code}
    </div>
  );
}
