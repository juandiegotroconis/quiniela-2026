import './Badge.css';
import type { ReactNode } from 'react';

type Variant = 'success' | 'error' | 'warning' | 'info' | 'default';

interface Props {
  children: ReactNode;
  variant?: Variant;
}

export default function Badge({ children, variant = 'default' }: Props) {
  return (
    <span className={`badge badge--${variant}`}>
      {children}
    </span>
  );
}
