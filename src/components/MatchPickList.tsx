import './MatchPickList.css';
import { useState } from 'react';
import { Icon } from '@iconify/react';
import { useTranslation } from '~/hooks/useTranslation';
import type { TranslationKey } from '~/lib/translation-context';
import Badge from './Badge';
import TeamFlag from './TeamFlag';
import {
  getPickResult,
  getResultVariant,
  getResultPoints,
  getLiveMinute,
  formatMatchDate,
  getStageLabelKey,
  KNOCKOUT_STAGE_ORDER,
} from '~/lib/helpers';
import type { UserPickEntry, BracketPickEntry } from '~/lib/auth-context';
import type { Match } from '~/lib/types';

interface Props {
  matches: Match[];
  picks: Record<number, UserPickEntry>;
  bracketPicks?: Record<number, BracketPickEntry>;
  pickLabelKey?: TranslationKey;
}

interface Section {
  key: string;
  label: string;
  matches: Match[];
}

const RESULT_COLORS: Record<string, string> = {
  exact: 'var(--color-green)',
  penalty_exact: 'var(--color-green)',
  tendency: 'var(--color-gold)',
  half: 'var(--color-info)',
  miss: 'var(--color-error)',
};

export default function MatchPickList({ matches, picks, bracketPicks, pickLabelKey = 'PROFILE_READONLY_YOUR_PICK' }: Props) {
  const { t, language } = useTranslation();
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

  const toggleSection = (key: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const groupSections: Section[] = [1, 2, 3].map(day => ({
    key: `matchday-${day}`,
    label: `${t('PROFILE_READONLY_MATCHDAY_PREFIX')} ${day}`,
    matches: matches.filter(m => m.stage === 'GROUP_STAGE' && m.day === day),
  }));

  // Show a knockout slot if teams are resolved OR the user has a bracket pick for it.
  const knockoutSections: Section[] = KNOCKOUT_STAGE_ORDER.map(stage => {
    const labelKey = getStageLabelKey(stage);
    return {
      key: `stage-${stage}`,
      label: labelKey ? t(labelKey) : stage,
      matches: matches.filter(m => {
        if (m.stage !== stage) return false;
        if (m.teamA && m.teamB) return true;
        const bp = bracketPicks?.[m.id];
        return !!(bp?.predHome && bp?.predAway);
      }),
    };
  }).filter(s => s.matches.length > 0);

  const sections = [...groupSections, ...knockoutSections];

  return (
    <>
      {sections.map(section => {
        const isOpen = openSections.has(section.key);
        return (
          <div key={section.key} className="match-pick-list__section">
            <button
              type="button"
              className="match-pick-list__section-header"
              onClick={() => toggleSection(section.key)}
              aria-expanded={isOpen}
            >
              <span className="match-pick-list__section-label">{section.label}</span>
              <Icon
                icon="mdi:chevron-down"
                width={20}
                className={`match-pick-list__section-chevron${isOpen ? ' match-pick-list__section-chevron--open' : ''}`}
              />
            </button>
            {isOpen && (
              <div className="match-pick-list__match-list">
                {section.matches.map(m => {
                  const pick = picks[m.id];
                  const bracket = bracketPicks?.[m.id];
                  const hasPick = pick && pick.pickA !== '' && pick.pickB !== '';
                  const isFinished = m.status === 'finished';
                  const isLive = m.status === 'live';

                  // Use real teams when resolved; fall back to user's bracket prediction.
                  const displayHome = m.teamA || bracket?.predHome || '';
                  const displayAway = m.teamB || bracket?.predAway || '';
                  // Slot not yet resolved — teams shown are the user's bracket picks.
                  const isPredicted = !m.teamA && !!bracket?.predHome;

                  // Show a mismatch hint when real teams are known but differ from
                  // what the user predicted in their bracket pick.
                  const hasRealTeams = !!(m.teamA && m.teamB);
                  const hasBracketPick = !!(bracket?.predHome && bracket?.predAway);
                  const teamsMatch =
                    hasRealTeams &&
                    hasBracketPick &&
                    ((bracket!.predHome === m.teamA && bracket!.predAway === m.teamB) ||
                      (bracket!.predHome === m.teamB && bracket!.predAway === m.teamA));
                  const showMismatch =
                    m.stage !== 'GROUP_STAGE' && hasRealTeams && hasBracketPick && !teamsMatch;

                  let result = null;
                  if (isFinished && hasPick) {
                    result = getPickResult(
                      m,
                      parseInt(String(pick.pickA)),
                      parseInt(String(pick.pickB)),
                      pick.pickPenaltiesWinner,
                    );
                  }

                  return (
                    <div key={m.id} className="match-pick-list__match-row">
                      <div className={`match-pick-list__match-teams${isPredicted ? ' match-pick-list__match-teams--predicted' : ''}`}>
                        <div className="match-pick-list__match-teams-row">
                          <TeamFlag code={displayHome} size={20} />
                          <span className="match-pick-list__match-vs">{t('PROFILE_READONLY_VS')}</span>
                          <TeamFlag code={displayAway} size={20} />
                        </div>
                        {showMismatch && (
                          <div className="match-pick-list__match-predicted">
                            <span className="match-pick-list__match-predicted-label">{t('MATCH_PICK_LIST_PREDICTED_LABEL')}</span>
                            <TeamFlag code={bracket!.predHome} size={13} />
                            <TeamFlag code={bracket!.predAway} size={13} />
                          </div>
                        )}
                      </div>
                      <div className="match-pick-list__match-result">
                        {isFinished || isLive ? (
                          <span className="match-pick-list__match-score-actual">
                            {m.scoreA}:{m.scoreB}
                          </span>
                        ) : (
                          <span className="match-pick-list__match-date">{formatMatchDate(m.utcDate, language)}</span>
                        )}
                      </div>
                      <div className="match-pick-list__match-pick-wrap">
                        <span className="match-pick-list__match-pick-label">{t(pickLabelKey)}</span>
                        <div className="match-pick-list__match-pick-col">
                          <span
                            className="match-pick-list__match-pick-score"
                            style={{ color: result ? RESULT_COLORS[result] : 'var(--fg-primary)' }}
                          >
                            {hasPick ? `${pick.pickA}:${pick.pickB}` : '—'}
                          </span>
                          {hasPick && pick.pickPenaltiesWinner && (
                            <span className="match-pick-list__match-pick-pen">
                              <span className="match-pick-list__match-pick-pen-label">{t('MATCH_PICK_LIST_PEN_LABEL')}</span>
                              <TeamFlag code={pick.pickPenaltiesWinner} size={14} />
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="match-pick-list__match-badge">
                        {isFinished && hasPick && result && (
                          <Badge variant={getResultVariant(result)}>
                            +{getResultPoints(result)}
                          </Badge>
                        )}
                        {isLive && (
                          <Badge variant="error">
                            {t('MATCH_CARD_STATUS_LIVE')}{m.isHalftime ? ` ${t('MATCH_CARD_STATUS_HT')}` : getLiveMinute(m) ? ` ${getLiveMinute(m)}` : ''}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
