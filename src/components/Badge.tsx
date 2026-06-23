import './Badge.css';
import type { ReactNode } from 'react';

type Variant = 'success' | 'error' | 'warning' | 'info' | 'default';

interface Props {
  children: ReactNode;
  variant?: Variant;
  className?: string;
}

export default function Badge({ children, variant = 'default', className }: Props) {
  return (
    <span className={`badge badge--${variant}${className ? ` ${className}` : ''}`}>
      {children}
    </span>
  );
}
