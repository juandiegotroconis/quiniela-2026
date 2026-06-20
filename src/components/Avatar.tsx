import "./Avatar.css";
import { AVATAR_COLORS } from "~/lib/mock-data";
import { useTheme } from "~/hooks/useTheme";

interface Props {
  name: string;
  index?: number;
  color?: string;
  size?: number;
}

// A couple of AVATAR_COLORS entries are dark enough that, used as both the
// text color and the background tint, they become unreadable against dark
// surfaces. Swap them for a lighter equivalent in dark mode only — the
// stored/picker color is untouched.
const DARK_THEME_OVERRIDES: Record<string, string> = {
  "#1A237E": "#5C6BC0",
  "#004D40": "#26A69A",
};

export default function Avatar({ name, index = 0, color, size = 36 }: Props) {
  const { theme } = useTheme();
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const rawFg = color ?? AVATAR_COLORS[index % AVATAR_COLORS.length];
  const fg =
    theme === "dark"
      ? DARK_THEME_OVERRIDES[rawFg.toUpperCase()] ?? rawFg
      : rawFg;
  return (
    <div
      className='avatar'
      style={{
        width: size,
        height: size,
        background: `color-mix(in srgb, ${fg} 18%, transparent)`,
        color: fg,
        fontSize: size * 0.38,
      }}
    >
      {initials}
    </div>
  );
}
