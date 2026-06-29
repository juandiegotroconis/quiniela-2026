import './PredictionGroupCard.css';
import Avatar from './Avatar';
import TeamFlag from './TeamFlag';
import { useTranslation } from '~/hooks/useTranslation';
import Badge from './Badge';
import type { PredictionGroup } from '~/lib/helpers';
import type { Match } from '~/lib/types';
import { TEAM_FULL } from '~/lib/mock-data';

interface Props {
  group: PredictionGroup;
  match: Match;
}

export default function PredictionGroupCard({ group, match }: Props) {
  const { t } = useTranslation();
  const resultColors = {
    exact: 'var(--color-green-25)',
    penalty_exact: 'var(--color-green-25)',
    half: 'rgba(51,221,170,0.25)',
    tendency: 'rgba(200,169,78,0.25)',
    miss: 'rgba(255,255,255,0.06)',
  };
  const borderColor = group.hasMe
    ? 'var(--color-green-25)'
    : group.result
    ? resultColors[group.result]
    : 'var(--border-subtle)';

  // ONE_SHOT knockout: show the predicted matchup only when it differs from the
  // actual teams in the slot — otherwise the header already shows it. When the
  // teams differ, the "2-1" score reads against these predicted teams, so the
  // flags are what make the pick legible.
  const showMatchup =
    !!group.predHome &&
    !!group.predAway &&
    (group.predHome !== match.teamA || group.predAway !== match.teamB);

  return (
    <div
      className={`pred-group-card${group.hasMe ? ' pred-group-card--me' : ''}`}
      style={{ borderColor }}
    >
      {group.hasMe && <div className="pred-group-card__your-pick">{t('PRED_GROUP_CARD_YOUR_PICK')}</div>}

      {showMatchup && (
        <div className="pred-group-card__matchup">
          <div className="pred-group-card__matchup-label">{t('PRED_GROUP_CARD_PREDICTED_MATCHUP')}</div>
          <div className="pred-group-card__matchup-teams">
            <span className="pred-group-card__matchup-team" title={TEAM_FULL[group.predHome!] ?? group.predHome!}>
              <TeamFlag code={group.predHome!} size={16} />
              {group.predHome}
            </span>
            <span className="pred-group-card__matchup-vs">{t('PRED_GROUP_CARD_MATCHUP_VS')}</span>
            <span className="pred-group-card__matchup-team" title={TEAM_FULL[group.predAway!] ?? group.predAway!}>
              <TeamFlag code={group.predAway!} size={16} />
              {group.predAway}
            </span>
          </div>
        </div>
      )}

      <div className="pred-group-card__score">
        <span>{group.pickA}</span>
        <span className="pred-group-card__score-sep">-</span>
        <span>{group.pickB}</span>
      </div>

      {/* A drawn knockout pick is only fully described by who advances on
          penalties — the scoreline alone ("1-1") doesn't say. Show the
          predicted advancing team's flag so the card matches the prediction. */}
      {group.pickPenaltiesWinner && (
        <div className="pred-group-card__penalty" title={TEAM_FULL[group.pickPenaltiesWinner] ?? group.pickPenaltiesWinner}>
          <TeamFlag code={group.pickPenaltiesWinner} size={18} />
          <span className="pred-group-card__penalty-text">
            {group.pickPenaltiesWinner} · {t('PRED_GROUP_CARD_PENALTY_WINNER')}
          </span>
        </div>
      )}

      {(match.status === 'finished' || match.status === 'live') && group.result && (
        <div className="pred-group-card__badge">
          <Badge variant={group.variant ?? 'default'}>
            +{group.points} {group.label}
          </Badge>
        </div>
      )}

      <div className="pred-group-card__players">
        {group.players.map(p => (
          <div key={p.userId} className="pred-group-card__player" title={p.displayName}>
            <Avatar name={p.displayName} color={p.avatarColor} size={28} />
            <span className={`pred-group-card__player-name${p.isMe ? ' pred-group-card__player-name--me' : ''}`}>
              {p.isMe ? t('PROFILE_YOU') : p.displayName.split(' ')[0]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
