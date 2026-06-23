import './MatchPickList.css';
import { useTranslation } from '~/hooks/useTranslation';
import type { TranslationKey } from '~/lib/translation-context';
import Badge from './Badge';
import TeamFlag from './TeamFlag';
import { getPickResult, getResultVariant, getResultPoints, getLiveMinute, formatMatchDate } from '~/lib/helpers';
import type { UserPickEntry } from '~/lib/auth-context';
import type { Match } from '~/lib/types';

interface Props {
  matches: Match[];
  picks: Record<number, UserPickEntry>;
  pickLabelKey?: TranslationKey;
}

const RESULT_COLORS: Record<string, string> = {
  exact: 'var(--color-green)',
  penalty_exact: 'var(--color-green)',
  tendency: 'var(--color-gold)',
  half: 'var(--color-info)',
  miss: 'var(--color-error)',
};

export default function MatchPickList({ matches, picks, pickLabelKey = 'PROFILE_READONLY_YOUR_PICK' }: Props) {
  const { t, language } = useTranslation();

  const matchdays = [1, 2, 3].map(day => ({
    day,
    label: `${t('PROFILE_READONLY_MATCHDAY_PREFIX')} ${day}`,
    matches: matches.filter(m => m.day === day),
  }));

  return (
    <>
      {matchdays.map(md => (
        <div key={md.day} className="match-pick-list__matchday">
          <div className="match-pick-list__matchday-label">{md.label}</div>
          <div className="match-pick-list__match-list">
            {md.matches.map(m => {
              const pick = picks[m.id];
              const hasPick = pick && pick.pickA !== '' && pick.pickB !== '';
              const isFinished = m.status === 'finished';
              const isLive = m.status === 'live';
              let result = null;
              if (isFinished && hasPick) {
                result = getPickResult(m, parseInt(String(pick.pickA)), parseInt(String(pick.pickB)));
              }

              return (
                <div key={m.id} className="match-pick-list__match-row">
                  <div className="match-pick-list__match-teams">
                    <TeamFlag code={m.teamA} size={20} />
                    <span className="match-pick-list__match-vs">{t('PROFILE_READONLY_VS')}</span>
                    <TeamFlag code={m.teamB} size={20} />
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
                    <span
                      className="match-pick-list__match-pick-score"
                      style={{ color: result ? RESULT_COLORS[result] : 'var(--fg-primary)' }}
                    >
                      {hasPick ? `${pick.pickA}:${pick.pickB}` : '—'}
                    </span>
                  </div>
                  <div className="match-pick-list__match-badge">
                    {isFinished && hasPick && result && (
                      <Badge variant={getResultVariant(result)}>
                        +{getResultPoints(result)}
                      </Badge>
                    )}
                    {isLive && (
                      <Badge variant="error">
                        <span className="badge__live-dot">●</span> {t('MATCH_CARD_STATUS_LIVE')}{m.isHalftime ? ` ${t('MATCH_CARD_STATUS_HT')}` : getLiveMinute(m) ? ` ${getLiveMinute(m)}` : ''}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}
