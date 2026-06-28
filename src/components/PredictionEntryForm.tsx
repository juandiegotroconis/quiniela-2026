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
  getCurrentKnockoutStage,
  getStageLabelKey,
  isKnockoutEntryOpen,
  isPredictionStageLocked,
  isStageFullyResolved,
  KNOCKOUT_STAGE_ORDER,
} from "~/lib/helpers";
import { GROUPS, TEAM_FULL } from "~/lib/mock-data";
import type { TopScorerSuggestion } from "~/lib/mock-data";
import type { BracketPickEntry, UserPickEntry } from "~/lib/auth-context";
import type { Match } from "~/lib/types";
import { useData } from "~/lib/data-context";
import { useNowTick } from "~/hooks/useNowTick";

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

export default function PredictionEntryForm({
  initialPicks = {},
  initialTopScorer = null,
  isUpdatable = true,
  knockoutMode = "STAGE_BY_STAGE",
  onSave,
  onSubmit,
}: Props) {
  const { matches } = useData();
  const { t, language } = useTranslation();
  const now = useNowTick();
  // A stage's picks lock once its deadline (first kickoff) passes — see
  // isPredictionStageLocked / getKnockoutEntryDeadline. Group picks are
  // always locked mid-tournament; knockout stages lock per knockout_mode.
  const groupLocked = isPredictionStageLocked(matches, "GROUP_STAGE", knockoutMode, now);
  const knockoutOpen = isKnockoutEntryOpen(matches, knockoutMode, now);
  // is_updatable governs the initial group/top-scorer entry; once it's off, the
  // form is knockout-only (group + top scorer hidden, just the open knockout
  // stage editable). Mirrors the is_prediction_open RLS gate.
  const groupEntryEnabled = isUpdatable;
  const [picks, setPicks] =
    useState<Record<number, UserPickEntry>>(initialPicks);
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

  const matchById = useMemo(() => {
    const map = new Map<number, Match>();
    for (const m of matches) map.set(m.id, m);
    return map;
  }, [matches]);

  // Cascade a user's winner picks through the bracket feeder graph (the
  // *_source_match_id / *_source_outcome columns). For a knockout match whose
  // teams aren't resolved yet, each slot's team is the predicted winner (or
  // loser, for the 3rd-place game) of the feeding match — derived recursively
  // from the user's score picks, so they never re-pick teams by hand.
  // Returns "" while the feeding pick is still missing/undecided.
  function slotTeam(m: Match, side: "home" | "away", depth = 0): string {
    const resolved = side === "home" ? m.teamA : m.teamB;
    if (resolved) return resolved;
    const srcId = side === "home" ? m.homeSourceMatchId : m.awaySourceMatchId;
    const outcome = side === "home" ? m.homeSourceOutcome : m.awaySourceOutcome;
    if (!srcId || !outcome) return "";
    return predictedOutcome(srcId, outcome, depth + 1);
  }

  function predictedOutcome(
    matchId: number,
    outcome: "winner" | "loser",
    depth = 0,
  ): string {
    if (depth > 8) return ""; // bracket is 6 rounds deep — guard against cycles
    const m = matchById.get(matchId);
    if (!m) return "";
    const home = slotTeam(m, "home", depth);
    const away = slotTeam(m, "away", depth);
    if (!home || !away) return "";
    const p = picks[m.id];
    if (!p || p.pickA === "" || p.pickB === "") return "";
    const a = Number(p.pickA);
    const b = Number(p.pickB);
    let winner: string;
    if (a > b) winner = home;
    else if (b > a) winner = away;
    else {
      // Draw in regulation/ET — the advancing team is the penalty pick.
      if (!p.pickPenaltiesWinner) return "";
      winner = p.pickPenaltiesWinner;
    }
    return outcome === "loser" ? (winner === home ? away : home) : winner;
  }

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

  // Only send picks for stages that are still open — a locked stage's write
  // is rejected by the is_prediction_open RLS gate, which would fail the whole
  // upsert. Locked-stage rows are already saved, so omitting them is safe.
  const stageOf = useMemo(() => {
    const map: Record<number, string> = {};
    for (const m of matches) map[m.id] = m.stage;
    return map;
  }, [matches]);

  const filterOpen = <T,>(entries: Record<number, T>): Record<number, T> => {
    const out: Record<number, T> = {};
    for (const [idStr, val] of Object.entries(entries)) {
      const stage = stageOf[Number(idStr)];
      if (stage && !isPredictionStageLocked(matches, stage, knockoutMode, now)) {
        out[Number(idStr)] = val;
      }
    }
    return out;
  };

  // ONE_SHOT only: the matchup the user predicts for each not-yet-resolved
  // knockout match, derived from their cascading winner picks. Saved as
  // bracket_predictions so the matchup bonus scores unchanged. Matches whose
  // teams are already known aren't guesses, so they're skipped.
  const derivedBracketPicks = useMemo<Record<number, BracketPickEntry>>(() => {
    if (knockoutMode !== "ONE_SHOT") return {};
    const out: Record<number, BracketPickEntry> = {};
    for (const m of matches) {
      if (m.stage === "GROUP_STAGE" || (m.teamA && m.teamB)) continue;
      const predHome = slotTeam(m, "home");
      const predAway = slotTeam(m, "away");
      if (predHome && predAway) out[m.id] = { predHome, predAway };
    }
    return out;
    // slotTeam closes over picks/matchById; those drive recomputation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches, picks, knockoutMode]);

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      // Top scorer is gated by is_updatable (top_scorer RLS), so only write it
      // during group/initial entry.
      await onSave(filterOpen(picks), groupEntryEnabled ? topScorer : null, filterOpen(derivedBracketPicks));
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
          {groupEntryEnabled || knockoutOpen
            ? t('PRED_FORM_SUBTITLE_OPEN')
            : t('PRED_FORM_SUBTITLE_LOCKED')}
        </p>
      </div>

      {groupEntryEnabled && (
      <>
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
                {groupLocked && (
                  <span className='pred-form__locked-badge'>{t('PRED_FORM_STAGE_LOCKED')}</span>
                )}
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
                            disabled={groupLocked}
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
                            disabled={groupLocked}
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
      </>
      )}

      {knockoutByStage.length > 0 && (
        <div className='pred-form__knockout-heading'>
          {t('PRED_FORM_KNOCKOUT_HEADING')}
        </div>
      )}

      {knockoutByStage.length > 0 && (
        <div className='pred-form__groups pred-form__knockout'>
          {knockoutByStage.map(({ stage, matches: stageMatches }) => {
            const stageLabelKey = getStageLabelKey(stage);
            const stageLocked = isPredictionStageLocked(matches, stage, knockoutMode, now);
            return (
              <div key={stage} className='pred-form__group'>
                <div className='pred-form__group-header'>
                  {stageLabelKey ? t(stageLabelKey) : stage}
                  {stageLocked && (
                    <span className='pred-form__locked-badge'>{t('PRED_FORM_STAGE_LOCKED')}</span>
                  )}
                </div>

                <div className='pred-form__matches'>
                  {stageMatches.map((m) => {
                    // Teams come from the bracket feeder graph: actual codes if
                    // already resolved, otherwise cascaded from the user's
                    // upstream winner picks (ONE_SHOT). "" means an earlier
                    // round hasn't been decided yet.
                    const teamA = slotTeam(m, "home");
                    const teamB = slotTeam(m, "away");
                    const resolved = Boolean(teamA) && Boolean(teamB);
                    if (!resolved) {
                      // STAGE_BY_STAGE never guesses future matchups — a stage
                      // only becomes visible once its teams are known, so this
                      // is just a transient gap right after the sync resolves
                      // the rest of the stage.
                      if (knockoutMode !== "ONE_SHOT") return null;
                      // ONE_SHOT: an upstream round isn't picked yet, so this
                      // match's teams can't be derived. Prompt the user to fill
                      // in the previous round first.
                      return (
                        <div key={m.id} className='pred-form__match-row pred-form__match-row--pending'>
                          <span className='pred-form__match-date'>{formatMatchDate(m.utcDate, language)}</span>
                          <span className='pred-form__bracket-prompt'>{t('PRED_FORM_BRACKET_PENDING')}</span>
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
                            <span className='pred-form__match-team-name'>{teamA}</span>
                            <TeamFlag code={teamA} size={22} />
                          </div>
                          <input
                            type='number'
                            inputMode='numeric'
                            min='0'
                            max='20'
                            className='pred-form__match-input'
                            value={p.pickA}
                            disabled={stageLocked}
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
                            disabled={stageLocked}
                            onChange={(e) => updatePick(m.id, p.pickA, e.target.value)}
                            placeholder='–'
                          />
                          <div className='pred-form__match-side pred-form__match-side--right'>
                            <TeamFlag code={teamB} size={22} />
                            <span className='pred-form__match-team-name'>{teamB}</span>
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
                                className={`pred-form__penalty-btn${p.pickPenaltiesWinner === teamA ? " pred-form__penalty-btn--active" : ""}`}
                                disabled={stageLocked}
                                onClick={() => updatePenaltyWinner(m.id, teamA)}
                              >
                                <TeamFlag code={teamA} size={18} />
                                {teamA}
                              </button>
                              <button
                                type='button'
                                className={`pred-form__penalty-btn${p.pickPenaltiesWinner === teamB ? " pred-form__penalty-btn--active" : ""}`}
                                disabled={stageLocked}
                                onClick={() => updatePenaltyWinner(m.id, teamB)}
                              >
                                <TeamFlag code={teamB} size={18} />
                                {teamB}
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

      {groupEntryEnabled && (
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
      )}

      {groupEntryEnabled && showErrors && !allFilled && (
        <div className='pred-form__error-msg'>
          {t('PRED_FORM_ERROR_INCOMPLETE')}
        </div>
      )}

      {groupEntryEnabled && (
      <div className='pred-form__submit-row'>
        <button
          className={`pred-form__submit${allFilled ? " pred-form__submit--ready" : " pred-form__submit--disabled"}`}
          onClick={handleSubmit}
          disabled={submitting || saving}
        >
          {submitting ? t('PRED_FORM_SUBMITTING') : t('PRED_FORM_SUBMIT')}
        </button>
      </div>
      )}

      {(groupEntryEnabled || knockoutOpen) && (
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
