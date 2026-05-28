import "./PositionChange.css";

interface Props {
  current: number;
  previous: number;
}

export default function PositionChange({ current, previous }: Props) {
  const diff = previous - current;
  if (diff === 0) {
    return <span className='position-change position-change--neutral'>-</span>;
  }
  const up = diff > 0;
  return (
    <span
      className={`position-change ${up ? "position-change--up" : "position-change--down"}`}
    >
      <span className='position-change__arrow'>{up ? "▲" : "▼"}</span>
      {Math.abs(diff)}
    </span>
  );
}
