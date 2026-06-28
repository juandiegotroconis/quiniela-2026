import "./PredictionEntryForm.css";
import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import PageContainer from "./PageContainer";
import RulesModal from "./RulesModal";
import { useTranslation } from "~/hooks/useTranslation";
import TeamFlag from "./TeamFlag";
import TopScorerPicker from "./TopScorerPicker";
import GroupNav from "./GroupNav";
import {
  calcGroupStandings,
  formatMatchDate,
  getAliveTeams,
  getCurrentKnockoutStage,
  getStageLabelKey,
  isStageFullyResolved,
  KNOCKOUT_STAGE_ORDER,
} from "~/lib/helpers";
import { GROUPS, TEAM_FULL } from "~/lib/mock-data";
import type { TopScorerSuggestion } from "~/lib/mock-data";
import type { BracketPickEntry, UserPickEntry } from "~/lib/auth-context";
import { useData } from "~/lib/data-context";

interface Props {
  initialPicks?: Record<number, UserPickEntry>;
  initialBracketPicks?: Record<number, BracketPickEntry>;
  initialTopScorer?: TopScorerSuggestion | null;
  isUpdatable?: boolean;
  knockoutMode?: string;
  onSave: (
    picks: Record<number, UserPickEntry>,
    scorer: TopScorerSuggestion | null,
    bracketPicks: Record<number, BracketPickEntry>,
  ) => Promise<void>;
  onSubmit: (
    picks: Record<number, UserPickEntry>,
    scorer: TopScorerSuggestion,
  ) => Promise<void>;
}

const EMPTY_PICK: UserPickEntry = { pickA: "", pickB: "", pickPenaltiesWinner: null };
const EMPTY_BRACKET_PICK: BracketPickEntry = { predHome: "", predAway: "" };

export default function PredictionEntryForm({
  initialPicks = {},
  initialBracketPicks = {},
  initialTopScorer = null,
  isUpdatable = true,
  knockoutMode = "STAGE_BY_STAGE",
  onSave,
  onSubmit,
}: Props) {
  const { matches } = useData();
  const { t, language } = useTranslation();
  const [picks, setPicks] =
    useState<Record<number, UserPickEntry>>(initialPicks);
  const [bracketPicks, setBracketPicks] =
    useState<Record<number, BracketPickEntry>>(initialBracketPicks);
  const [topScorer, setTopScorer] = useState<TopScorerSuggestion | null>(
    initialTopScorer,
  );
  const handleScorerChange = (scorer: TopScorerSuggestion | null) => {
    setTopScorer(scorer);
    setIsDirty(true);
  };
  const [showRules, setShowRules] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const updatePick = (matchId: number, pickA: string, pickB: string) => {
    setPicks((prev) => ({
      ...prev,
      [matchId]: { ...(prev[matchId] ?? EMPTY_PICK), pickA, pickB },
    }));
    setIsDirty(true);
  };

  const updatePenaltyWinner = (matchId: number, teamCode: string) => {
    setPicks((prev) => ({
      ...prev,
      [matchId]: { ...(prev[matchId] ?? EMPTY_PICK), pickPenaltiesWinner: teamCode },
    }));
    setIsDirty(true);
  };

  const updateBracketPick = (
    matchId: number,
    side: "predHome" | "predAway",
    teamCode: string,
  ) => {
    setBracketPicks((prev) => ({
      ...prev,
      [matchId]: { ...(prev[matchId] ?? EMPTY_BRACKET_PICK), [side]: teamCode },
    }));
    setIsDirty(true);
  };

  const aliveTeams = useMemo(() => getAliveTeams(matches), [matches]);

  // Knockout predictions only open once the entire Round of 32 is resolved
  // (every match has both teams), not one match at a time as the
  // bracket-resolution sync trickles them in.
  const knockoutAvailable = useMemo(
    () => isStageFullyResolved(matches, "LAST_32"),
    [matches],
  );

  // ONE_SHOT: every knockout stage is open at once (later, undetermined
  // rounds use the matchup-guess picker). STAGE_BY_STAGE: only the current
  // stage is open, and only once its teams are known.
  const visibleKnockoutStages = useMemo(() => {
    if (!knockoutAvailable) return [];
    if (knockoutMode === "ONE_SHOT") return KNOCKOUT_STAGE_ORDER;
    const current = getCurrentKnockoutStage(matches);
    return current ? [current] : [];
  }, [knockoutAvailable, knockoutMode, matches]);

  const knockoutByStage = useMemo(
    () =>
      KNOCKOUT_STAGE_ORDER.filter((stage) => visibleKnockoutStages.includes(stage)).map(
        (stage) => ({
          stage,
          matches: matches.filter((m) => m.stage === stage),
        }),
      ).filter((s) => s.matches.length > 0),
    [matches, visibleKnockoutStages],
  );

  const groupStageMatches = matches.filter((m) => m.stage === "GROUP_STAGE");
  const filledCount = groupStageMatches.filter(
    (m) => (picks[m.id]?.pickA ?? "") !== "" && (picks[m.id]?.pickB ?? "") !== "",
  ).length;
  const totalMatches = groupStageMatches.length;
  const allFilled = filledCount === totalMatches && topScorer !== null;
  const hasSomeFilled = filledCount > 0 || topScorer !== null;
  const progress =
    totalMatches > 0
      ? ((filledCount + (topScorer ? 1 : 0)) / (totalMatches + 1)) * 100
      : 0;

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      await onSave(picks, topScorer, bracketPicks);
      setSaveMsg(t('PRED_FORM_SAVED'));
      setIsDirty(false);
      setTimeout(() => setSaveMsg(null), 2500);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!allFilled) {
      setShowErrors(true);
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(picks, topScorer!);
    } finally {
      setSubmitting(false);
    }
  };

  const groupEntries = Object.keys(GROUPS).map((gId) => ({
    id: gId,
    matches: matches.filter((m) => m.group === gId),
  }));

  return (
    <PageContainer wide>
      {showRules && <RulesModal onClose={() => setShowRules(false)} />}

      <div className='pred-form__heading'>
        <div className='pred-form__heading-row'>
          <div className='pred-form__title'>{t('PRED_FORM_TITLE')}</div>
          <button className='pred-form__info-btn' onClick={() => setShowRules(true)} aria-label='Rules'>
            <Icon icon='mdi:information-outline' width={20} />
          </button>
        </div>
        <p className='pred-form__subtitle'>
          {isUpdatable ? t('PRED_FORM_SUBTITLE_OPEN') : t('PRED_FORM_SUBTITLE_LOCKED')}
        </p>
      </div>

      <div className='pred-form__progress'>
        <div className='pred-form__progress-inner'>
          <div className='pred-form__progress-labels'>
            <span className='pred-form__progress-label'>{t('PRED_FORM_PROGRESS_LABEL')}</span>
            <span
              className={`pred-form__progress-count${allFilled ? " pred-form__progress-count--done" : ""}`}
            >
              {filledCount}/{totalMatches} {t('PRED_FORM_MATCHES_COUNT')}
              {topScorer ? ` ${t('PRED_FORM_TOP_SCORER_COUNT')}` : ""}
            </span>
          </div>
          <div className='pred-form__progress-track'>
            <div
              className={`pred-form__progress-fill${allFilled ? " pred-form__progress-fill--done" : ""}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <GroupNav groups={groupEntries.map((g) => g.id)} />

      <div className='pred-form__groups'>
        {groupEntries.map((g) => {
          const standings = calcGroupStandings(g.id, matches, picks);
          const filledInGroup = g.matches.filter(
            (m) =>
              picks[m.id]?.pickA !== "" &&
              picks[m.id]?.pickB !== "" &&
              picks[m.id],
          ).length;

          return (
            <div key={g.id} id={`group-${g.id}`} className='pred-form__group'>
              <div className='pred-form__group-header'>
                {t('PRED_FORM_GROUP_PREFIX')} {g.id}
                <span className='pred-form__group-count'>
                  {filledInGroup}/{g.matches.length}
                </span>
              </div>

              <div className='pred-form__mini-standings'>
                <div className='pred-form__mini-header'>
                  <span>#</span>
                  <span>{t('PRED_FORM_MINI_HEADER_TEAM')}</span>
                  <span className='pred-form__mini-col-center'>{t('PRED_FORM_MINI_HEADER_GD')}</span>
                  <span className='pred-form__mini-col-center'>{t('PRED_FORM_MINI_HEADER_GF')}</span>
                  <span className='pred-form__mini-col-pts'>{t('GROUP_TABLE_HEADER_PTS')}</span>
                </div>
                {standings.map((t, i) => {
                  const qualify = i < 2;
                  const gdPos = t.gd > 0;
                  const gdNeg = t.gd < 0;
                  return (
                    <div key={t.team} className='pred-form__mini-row'>
                      <span
                        className={`pred-form__mini-pos${qualify ? " pred-form__mini-pos--qualify" : ""}`}
                      >
                        {i + 1}
                      </span>
                      <div className='pred-form__mini-team'>
                        <TeamFlag code={t.team} size={18} />
                        <span
                          className={`pred-form__mini-team-name${qualify ? " pred-form__mini-team-name--qualify" : ""}`}
                        >
                          {t.team}
                        </span>
                      </div>
                      <span
                        className={`pred-form__mini-gd${gdPos ? " pred-form__mini-gd--pos" : gdNeg ? " pred-form__mini-gd--neg" : ""}`}
                      >
                        {t.gd > 0 ? "+" : ""}
                        {t.gd}
                      </span>
                      <span className='pred-form__mini-gf'>{t.gf}</span>
                      <span className='pred-form__mini-pts'>{t.pts}</span>
                    </div>
                  );
                })}
              </div>

              <div className='pred-form__matches'>
                {g.matches.map((m) => {
                  const p = picks[m.id] ?? EMPTY_PICK;
                  const isEmpty = p.pickA === "" || p.pickB === "";
                  const hasError = showErrors && isEmpty;
                  return (
                    <div key={m.id} className='pred-form__match-row'>
                      <span className='pred-form__match-date'>{formatMatchDate(m.utcDate, language)}</span>
                      <div className='pred-form__match-teams'>
                          <div className='pred-form__match-side'>
                            <span className='pred-form__match-team-name'>
                              {m.teamA}
                            </span>
                            <TeamFlag code={m.teamA} size={22} />
                          </div>
                          <input
                            type='number'
                            inputMode='numeric'
                            min='0'
                            max='20'
                            className={`pred-form__match-input${hasError ? " pred-form__match-input--error" : ""}`}
                            value={p.pickA}
                            onChange={(e) =>
                              updatePick(m.id, e.target.value, p.pickB)
                            }
                            placeholder='–'
                          />
                          <span className='pred-form__match-sep'>:</span>
                          <input
                            type='number'
                            inputMode='numeric'
                            min='0'
                            max='20'
                            className={`pred-form__match-input${hasError ? " pred-form__match-input--error" : ""}`}
                            value={p.pickB}
                            onChange={(e) =>
                              updatePick(m.id, p.pickA, e.target.value)
                            }
                            placeholder='–'
                          />
                          <div className='pred-form__match-side pred-form__match-side--right'>
                            <TeamFlag code={m.teamB} size={22} />
                            <span className='pred-form__match-team-name'>
                              {m.teamB}
                            </span>
                          </div>
                        </div>
                        <div className='pred-form__match-icon'>
                          {!isEmpty && (
                            <svg
                              width='14'
                              height='14'
                              viewBox='0 0 24 24'
                              fill='var(--color-green)'
                            >
                              <path d='M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z' />
                            </svg>
                          )}
                          {hasError && (
                            <svg
                              width='14'
                              height='14'
                              viewBox='0 0 24 24'
                              fill='var(--color-error)'
                            >
                              <path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z' />
                            </svg>
                          )}
                        </div>
                      {m.venue && (
                        <div className='pred-form__match-venue'>
                          <span className='pred-form__match-venue-name'>
                            {m.venue}
                          </span>
                          {m.venueCity && (
                            <span className='pred-form__match-venue-city'>
                              {m.venueCity}
                              {m.venueCountry && `, ${TEAM_FULL[m.venueCountry]}`}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {knockoutByStage.length > 0 && (
        <div className='pred-form__knockout-heading'>
          {t('PRED_FORM_KNOCKOUT_HEADING')}
        </div>
      )}

      {knockoutByStage.length > 0 && (
        <div className='pred-form__groups pred-form__knockout'>
          {knockoutByStage.map(({ stage, matches: stageMatches }) => {
            const stageLabelKey = getStageLabelKey(stage);
            return (
              <div key={stage} className='pred-form__group'>
                <div className='pred-form__group-header'>
                  {stageLabelKey ? t(stageLabelKey) : stage}
                </div>

                <div className='pred-form__matches'>
                  {stageMatches.map((m) => {
                    const resolved = Boolean(m.teamA) && Boolean(m.teamB);
                    if (!resolved) {
                      // STAGE_BY_STAGE never guesses future matchups — a
                      // stage only becomes visible once its teams are known,
                      // so this is just a transient gap right after the
                      // sync resolves the rest of the stage.
                      if (knockoutMode !== "ONE_SHOT") return null;
                      const bp = bracketPicks[m.id] ?? EMPTY_BRACKET_PICK;
                      return (
                        <div key={m.id} className='pred-form__bracket-match'>
                          <span className='pred-form__match-date'>{formatMatchDate(m.utcDate, language)}</span>
                          <span className='pred-form__bracket-prompt'>{t('PRED_FORM_BRACKET_PROMPT')}</span>
                          <div className='pred-form__bracket-pickers'>
                            <select
                              className='pred-form__bracket-select'
                              value={bp.predHome}
                              onChange={(e) => updateBracketPick(m.id, 'predHome', e.target.value)}
                            >
                              <option value=''>{t('PRED_FORM_BRACKET_HOME_PLACEHOLDER')}</option>
                              {aliveTeams
                                .filter((c) => c !== bp.predAway)
                                .map((c) => (
                                  <option key={c} value={c}>
                                    {TEAM_FULL[c] ?? c}
                                  </option>
                                ))}
                            </select>
                            <span className='pred-form__match-sep'>{t('PROFILE_READONLY_VS')}</span>
                            <select
                              className='pred-form__bracket-select'
                              value={bp.predAway}
                              onChange={(e) => updateBracketPick(m.id, 'predAway', e.target.value)}
                            >
                              <option value=''>{t('PRED_FORM_BRACKET_AWAY_PLACEHOLDER')}</option>
                              {aliveTeams
                                .filter((c) => c !== bp.predHome)
                                .map((c) => (
                                  <option key={c} value={c}>
                                    {TEAM_FULL[c] ?? c}
                                  </option>
                                ))}
                            </select>
                          </div>
                        </div>
                      );
                    }

                    const p = picks[m.id] ?? EMPTY_PICK;
                    const isEmpty = p.pickA === "" || p.pickB === "";
                    const isDrawPick = !isEmpty && p.pickA === p.pickB;
                    return (
                      <div key={m.id} className='pred-form__match-row'>
                        <span className='pred-form__match-date'>{formatMatchDate(m.utcDate, language)}</span>
                        <div className='pred-form__match-teams'>
                          <div className='pred-form__match-side'>
                            <span className='pred-form__match-team-name'>{m.teamA}</span>
                            <TeamFlag code={m.teamA} size={22} />
                          </div>
                          <input
                            type='number'
                            inputMode='numeric'
                            min='0'
                            max='20'
                            className='pred-form__match-input'
                            value={p.pickA}
                            onChange={(e) => updatePick(m.id, e.target.value, p.pickB)}
                            placeholder='–'
                          />
                          <span className='pred-form__match-sep'>:</span>
                          <input
                            type='number'
                            inputMode='numeric'
                            min='0'
                            max='20'
                            className='pred-form__match-input'
                            value={p.pickB}
                            onChange={(e) => updatePick(m.id, p.pickA, e.target.value)}
                            placeholder='–'
                          />
                          <div className='pred-form__match-side pred-form__match-side--right'>
                            <TeamFlag code={m.teamB} size={22} />
                            <span className='pred-form__match-team-name'>{m.teamB}</span>
                          </div>
                        </div>
                        {m.venue && (
                          <div className='pred-form__match-venue'>
                            <span className='pred-form__match-venue-name'>{m.venue}</span>
                            {m.venueCity && (
                              <span className='pred-form__match-venue-city'>
                                {m.venueCity}
                                {m.venueCountry && `, ${TEAM_FULL[m.venueCountry]}`}
                              </span>
                            )}
                          </div>
                        )}
                        {isDrawPick && (
                          <div className='pred-form__penalty-picker'>
                            <span className='pred-form__penalty-label'>{t('PRED_FORM_PENALTY_PROMPT')}</span>
                            <div className='pred-form__penalty-options'>
                              <button
                                type='button'
                                className={`pred-form__penalty-btn${p.pickPenaltiesWinner === m.teamA ? " pred-form__penalty-btn--active" : ""}`}
                                onClick={() => updatePenaltyWinner(m.id, m.teamA)}
                              >
                                <TeamFlag code={m.teamA} size={18} />
                                {m.teamA}
                              </button>
                              <button
                                type='button'
                                className={`pred-form__penalty-btn${p.pickPenaltiesWinner === m.teamB ? " pred-form__penalty-btn--active" : ""}`}
                                onClick={() => updatePenaltyWinner(m.id, m.teamB)}
                              >
                                <TeamFlag code={m.teamB} size={18} />
                                {m.teamB}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div
        className={`pred-form__scorer${showErrors && !topScorer ? " pred-form__scorer--error" : ""}`}
      >
        <div className='pred-form__scorer-heading'>
          <svg
            width='18'
            height='18'
            viewBox='0 0 24 24'
            fill='var(--color-gold)'
          >
            <path d='M7.5 21H2V9h5.5v12zm7.25-18h-5.5v18h5.5V3zM22 11h-5.5v10H22V11z' />
          </svg>
          {t('PRED_FORM_TOP_SCORER_HEADING')}
          <span className='pred-form__scorer-bonus'>{t('PRED_FORM_TOP_SCORER_BONUS')}</span>
        </div>
        <TopScorerPicker value={topScorer} onChange={handleScorerChange} />
      </div>

      {showErrors && !allFilled && (
        <div className='pred-form__error-msg'>
          {t('PRED_FORM_ERROR_INCOMPLETE')}
        </div>
      )}

      <div className='pred-form__submit-row'>
        <button
          className={`pred-form__submit${allFilled ? " pred-form__submit--ready" : " pred-form__submit--disabled"}`}
          onClick={handleSubmit}
          disabled={submitting || saving}
        >
          {submitting ? t('PRED_FORM_SUBMITTING') : t('PRED_FORM_SUBMIT')}
        </button>
      </div>

      {isUpdatable && (
        <div className={`pred-form__sticky-bar${isDirty ? " pred-form__sticky-bar--dirty" : ""}`}>
          <span className='pred-form__sticky-status'>
            {saveMsg
              ? saveMsg
              : isDirty
                ? t('PRED_FORM_STATUS_UNSAVED')
                : hasSomeFilled
                  ? t('PRED_FORM_STATUS_ALL_SAVED')
                  : t('PRED_FORM_STATUS_NO_PICKS')}
          </span>
          <button
            className={`pred-form__save${hasSomeFilled && !saving ? " pred-form__save--ready" : " pred-form__save--disabled"}`}
            onClick={handleSave}
            disabled={saving || submitting || !hasSomeFilled}
          >
            {saving ? t('PRED_FORM_SAVING') : t('PRED_FORM_SAVE')}
          </button>
        </div>
      )}
    </PageContainer>
  );
}
