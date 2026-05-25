import './Sparkline.css';

interface Props {
  history: number[];
  width?: number;
  height?: number;
}

export default function Sparkline({ history, width = 64, height = 22 }: Props) {
  if (!history || history.length < 2) return null;
  const max = 15;
  const pts = history.map((r, i) => {
    const x = (i / (history.length - 1)) * width;
    const y = ((r - 1) / (max - 1)) * (height - 4) + 2;
    return [x, y] as [number, number];
  });
  const cur = history[history.length - 1];
  const prev = history[history.length - 2];
  const c = cur < prev ? '#02B906' : cur > prev ? '#E61D25' : 'rgba(255,255,255,0.3)';
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
