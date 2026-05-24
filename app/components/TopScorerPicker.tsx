import './TopScorerPicker.css';
import { useState, useRef, useEffect } from 'react';
import TeamFlag from './TeamFlag';
import { TOP_SCORER_SUGGESTIONS } from '~/lib/mock-data';
import type { TopScorerSuggestion } from '~/lib/mock-data';

interface Props {
  value: TopScorerSuggestion | null;
  onChange?: (v: TopScorerSuggestion) => void;
  disabled?: boolean;
}

export default function TopScorerPicker({ value, onChange, disabled }: Props) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = search
    ? TOP_SCORER_SUGGESTIONS.filter(
        p =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.team.toLowerCase().includes(search.toLowerCase())
      )
    : TOP_SCORER_SUGGESTIONS;

  const handleSelect = (p: TopScorerSuggestion) => {
    onChange?.(p);
    setOpen(false);
    setSearch('');
  };

  return (
    <div className="ts-picker" ref={ref}>
      <div
        className={`ts-picker__trigger${disabled ? ' ts-picker__trigger--disabled' : ''}`}
        onClick={() => !disabled && setOpen(!open)}
      >
        {value ? (
          <div className="ts-picker__trigger-value">
            <TeamFlag code={value.team} size={24} />
            <span className="ts-picker__trigger-name">{value.name}</span>
          </div>
        ) : (
          <span className="ts-picker__placeholder">Select top scorer prediction...</span>
        )}
        {!disabled && (
          <svg
            className={`ts-picker__chevron${open ? ' ts-picker__chevron--open' : ''}`}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="var(--fg-tertiary)"
          >
            <path d="M7 10l5 5 5-5z" />
          </svg>
        )}
      </div>

      {open && !disabled && (
        <div className="ts-picker__dropdown">
          <div className="ts-picker__search-wrap">
            <input
              type="text"
              className="ts-picker__search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search player or team..."
              autoFocus
            />
          </div>
          <div className="ts-picker__list">
            {filtered.length === 0 ? (
              <div className="ts-picker__empty">No players found</div>
            ) : (
              filtered.map(p => (
                <div
                  key={p.name}
                  className={`ts-picker__option${value?.name === p.name ? ' ts-picker__option--selected' : ''}`}
                  onClick={() => handleSelect(p)}
                >
                  <TeamFlag code={p.team} size={22} />
                  <span className="ts-picker__option-name">{p.name}</span>
                  <span className="ts-picker__option-team">{p.team}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
