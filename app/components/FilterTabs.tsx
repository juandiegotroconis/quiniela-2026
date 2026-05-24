import './FilterTabs.css';

interface Tab {
  id: string;
  label: string;
}

interface Props {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
}

export default function FilterTabs({ tabs, active, onChange }: Props) {
  return (
    <div className="filter-tabs">
      {tabs.map(t => (
        <button
          key={t.id}
          className={`filter-tabs__btn${active === t.id ? ' filter-tabs__btn--active' : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
