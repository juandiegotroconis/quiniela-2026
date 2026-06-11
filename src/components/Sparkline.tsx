import './Sparkline.css';

interface Props {
  history: number[];
  width?: number;
  height?: number;
}

export default function Sparkline({ history, width = 64, height = 22 }: Props) {
  if (!history || history.length < 2) return null;
  const min = Math.min(...history);
  const max = Math.max(...history);
  const range = max - min;
  const pts = history.map((r, i) => {
    const x = (i / (history.length - 1)) * width;
    // Rank 1 is best, so a lower rank should plot near the top of the chart.
    const y = range === 0 ? height / 2 : ((r - min) / range) * (height - 4) + 2;
    return [x, y] as [number, number];
  });
  const cur = history[history.length - 1];
  const prev = history[history.length - 2];
  const c =
    cur < prev ? 'var(--color-green)' : cur > prev ? 'var(--color-error)' : 'var(--fg-tertiary)';
  const last = pts[pts.length - 1];
  return (
    <svg className="sparkline" width={width} height={height}>
      <polyline
        points={pts.map(p => p.join(',')).join(' ')}
        fill="none"
        stroke={c}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r="2.5" fill={c} />
    </svg>
  );
}
