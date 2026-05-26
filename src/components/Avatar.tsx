import "./Avatar.css";
import { AVATAR_COLORS } from "~/lib/mock-data";

interface Props {
  name: string;
  index?: number;
  color?: string;
  size?: number;
}

export default function Avatar({ name, index = 0, color, size = 36 }: Props) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const bg = color ?? AVATAR_COLORS[index % AVATAR_COLORS.length];
  return (
    <div
      className='avatar'
      style={{
        width: size,
        height: size,
        background: bg,
        fontSize: size * 0.38,
      }}
    >
      {initials}
    </div>
  );
}
