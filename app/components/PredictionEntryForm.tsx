import './PredictionEntryForm.css';
import { useState } from 'react';
import PageContainer from './PageContainer';
import TeamFlag from './TeamFlag';
import TopScorerPicker from './TopScorerPicker';
import { calcGroupStandings } from '~/lib/helpers';
import { GROUPS, MATCHES } from '~/lib/mock-data';
import type { TopScorerSuggestion } from '~/lib/mock-data';
import type { UserPickEntry } from '~/lib/auth-context';

interface Props {
  onSubmit: (picks: Record<number, UserPickEntry>, scorer: TopScorerSuggestion) => void;
}

export default function PredictionEntryForm({ onSubmit }: Props) {
  const [picks, setPicks] = useState<Record<number, UserPickEntry>>({});
  const [topScorer, setTopScorer] = useState<TopScorerSuggestion | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  const updatePick = (matchId: number, pickA: string, pickB: string) => {
    setPicks(prev => ({ ...prev, [matchId]: { pickA, pickB } }));
  };

  const filledCount = Object.values(picks).filter(
    p => p.pickA !== '' && p.pickB !== ''
  ).length;
  const totalMatches = MATCHES.length;
  const allFilled = filledCount === totalMatches && topScorer !== null;
  const progress = ((filledCount + (topScorer ? 1 : 0)) / (totalMatches + 1)) * 100;

  const handleSubmit = () => {
    if (!allFilled) {
      setShowErrors(true);
      return;
    }
    onSubmit(picks, topScorer!);
  };

  const groupEntries = Object.keys(GROUPS).map(gId => ({
    id: gId,
    matches: MATCHES.filter(m => m.group === gId),
  }));

  return (
    <PageContainer wide>
      <div className="pred-form__heading">
        <div className="pred-form__title">Enter Your Predictions</div>
        <p className="pred-form__subtitle">
          Fill in your predicted score for every match and pick the tournament top scorer.
          Once submitted, predictions are final and cannot be changed.
        </p>
      </div>

      <div className="pred-form__progress">
        <div className="pred-form__progress-inner">
          <div className="pred-form__progress-labels">
            <span className="pred-form__progress-label">Progress</span>
            <span className={`pred-form__progress-count${allFilled ? ' pred-form__progress-count--done' : ''}`}>
              {filledCount}/{totalMatches} matches{topScorer ? ' + top scorer' : ''}
            </span>
          </div>
          <div className="pred-form__progress-track">
            <div
              className={`pred-form__progress-fill${allFilled ? ' pred-form__progress-fill--done' : ''}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="pred-form__groups">
        {groupEntries.map(g => {
          const standings = calcGroupStandings(g.id, picks);
          const filledInGroup = g.matches.filter(
            m => picks[m.id]?.pickA !== '' && picks[m.id]?.pickB !== '' && picks[m.id]
          ).length;

          return (
            <div key={g.id} className="pred-form__group">
              <div className="pred-form__group-header">
                Group {g.id}
                <span className="pred-form__group-count">
                  {filledInGroup}/{g.matches.length}
                </span>
              </div>

              <div className="pred-form__mini-standings">
                <div className="pred-form__mini-header">
                  <span>#</span>
                  <span>Team</span>
                  <span className="pred-form__mini-col-center">GD</span>
                  <span className="pred-form__mini-col-center">GF</span>
                  <span className="pred-form__mini-col-pts">Pts</span>
                </div>
                {standings.map((t, i) => {
                  const qualify = i < 2;
                  const gdPos = t.gd > 0;
                  const gdNeg = t.gd < 0;
                  return (
                    <div key={t.team} className="pred-form__mini-row">
                      <span className={`pred-form__mini-pos${qualify ? ' pred-form__mini-pos--qualify' : ''}`}>
                        {i + 1}
                      </span>
                      <div className="pred-form__mini-team">
                        <TeamFlag code={t.team} size={18} />
                        <span className={`pred-form__mini-team-name${qualify ? ' pred-form__mini-team-name--qualify' : ''}`}>
                          {t.team}
                        </span>
                      </div>
                      <span className={`pred-form__mini-gd${gdPos ? ' pred-form__mini-gd--pos' : gdNeg ? ' pred-form__mini-gd--neg' : ''}`}>
                        {t.gd > 0 ? '+' : ''}{t.gd}
                      </span>
                      <span className="pred-form__mini-gf">{t.gf}</span>
                      <span className="pred-form__mini-pts">{t.pts}</span>
                    </div>
                  );
                })}
              </div>

              <div className="pred-form__matches">
                {g.matches.map(m => {
                  const p = picks[m.id] ?? { pickA: '', pickB: '' };
                  const isEmpty = p.pickA === '' || p.pickB === '';
                  const hasError = showErrors && isEmpty;
                  return (
                    <div key={m.id} className="pred-form__match-row">
                      <span className="pred-form__match-date">{m.date}</span>
                      <div className="pred-form__match-teams">
                        <div className="pred-form__match-side">
                          <span className="pred-form__match-team-name">{m.teamA}</span>
                          <TeamFlag code={m.teamA} size={22} />
                        </div>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          className={`pred-form__match-input${hasError ? ' pred-form__match-input--error' : ''}`}
                          value={p.pickA}
                          onChange={e => updatePick(m.id, e.target.value, p.pickB)}
                          placeholder="–"
                        />
                        <span className="pred-form__match-sep">:</span>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          className={`pred-form__match-input${hasError ? ' pred-form__match-input--error' : ''}`}
                          value={p.pickB}
                          onChange={e => updatePick(m.id, p.pickA, e.target.value)}
                          placeholder="–"
                        />
                        <div className="pred-form__match-side pred-form__match-side--right">
                          <TeamFlag code={m.teamB} size={22} />
                          <span className="pred-form__match-team-name">{m.teamB}</span>
                        </div>
                      </div>
                      <div className="pred-form__match-icon">
                        {!isEmpty && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--color-green)">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                          </svg>
                        )}
                        {hasError && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--color-error)">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                          </svg>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className={`pred-form__scorer${showErrors && !topScorer ? ' pred-form__scorer--error' : ''}`}>
        <div className="pred-form__scorer-heading">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--color-gold)">
            <path d="M7.5 21H2V9h5.5v12zm7.25-18h-5.5v18h5.5V3zM22 11h-5.5v10H22V11z" />
          </svg>
          Top Scorer Prediction
          <span className="pred-form__scorer-bonus">+15 bonus if correct</span>
        </div>
        <TopScorerPicker value={topScorer} onChange={setTopScorer} />
      </div>

      {showErrors && !allFilled && (
        <div className="pred-form__error-msg">
          Please fill in all match predictions and select a top scorer before submitting.
        </div>
      )}

      <div className="pred-form__submit-row">
        <button
          className={`pred-form__submit${allFilled ? ' pred-form__submit--ready' : ' pred-form__submit--disabled'}`}
          onClick={handleSubmit}
        >
          Submit Predictions
        </button>
      </div>
    </PageContainer>
  );
}
