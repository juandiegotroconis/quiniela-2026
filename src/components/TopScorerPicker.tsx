import './TopScorerPicker.css';
import { useState, useRef, useEffect, useCallback } from 'react';
import TeamFlag from './TeamFlag';
import { searchPlayers } from '~/lib/queries';
import type { PlayerResult } from '~/lib/queries';
import type { TopScorerSuggestion } from '~/lib/mock-data';

interface Props {
  value: TopScorerSuggestion | null;
  onChange?: (v: TopScorerSuggestion) => void;
  disabled?: boolean;
}

export default function TopScorerPicker({ value, onChange, disabled }: Props) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<PlayerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await searchPlayers(q);
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearchChange = (q: string) => {
    setSearch(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(q), 300);
  };

  const handleSelect = (p: PlayerResult) => {
    onChange?.({ name: p.name, team: p.team_code });
    setOpen(false);
    setSearch('');
    setResults([]);
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
              onChange={e => handleSearchChange(e.target.value)}
              placeholder="Search player name..."
              autoFocus
            />
          </div>
          <div className="ts-picker__list">
            {loading ? (
              <div className="ts-picker__empty">Searching…</div>
            ) : !search.trim() ? (
              <div className="ts-picker__empty">Type to search players</div>
            ) : results.length === 0 ? (
              <div className="ts-picker__empty">No players found</div>
            ) : (
              results.map(p => (
                <div
                  key={p.id}
                  className={`ts-picker__option${value?.name === p.name ? ' ts-picker__option--selected' : ''}`}
                  onClick={() => handleSelect(p)}
                >
                  <TeamFlag code={p.team_code} size={22} />
                  <span className="ts-picker__option-name">{p.name}</span>
                  <span className="ts-picker__option-team">{p.team_code}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
