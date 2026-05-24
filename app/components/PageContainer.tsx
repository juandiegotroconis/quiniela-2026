import './PageContainer.css';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  wide?: boolean;
}

export default function PageContainer({ children, wide }: Props) {
  return (
    <div className={`page-container${wide ? ' page-container--wide' : ''}`}>
      {children}
    </div>
  );
}
