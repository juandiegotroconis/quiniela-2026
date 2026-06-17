import './Skeleton.css';

interface Props {
  width?: string | number;
  height?: string | number;
  radius?: string;
  className?: string;
}

export default function Skeleton({ width = '100%', height = '14px', radius, className }: Props) {
  return (
    <div
      className={`skeleton${className ? ` ${className}` : ''}`}
      style={{ width, height, borderRadius: radius }}
    />
  );
}
