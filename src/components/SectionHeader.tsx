import './SectionHeader.css';
import type { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}

export default function SectionHeader({ title, subtitle, right }: Props) {
  return (
    <div className="section-header">
      <div className="section-header__left">
        <h2 className="section-header__title">{title}</h2>
        {subtitle && <p className="section-header__subtitle">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}
