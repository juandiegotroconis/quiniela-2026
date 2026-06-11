import "./MatchCard.css";
import TeamFlag from "./TeamFlag";
import { useTranslation } from "~/hooks/useTranslation";
import Badge from "./Badge";
import {
  getLiveMinute,
  formatMatchDate,
  formatMatchTime,
  getStageLabelKey,
} from "~/lib/helpers";
import type { Match } from "~/lib/types";
import { TEAM_FULL } from "~/lib/mock-data";

interface Props {
  match: Match;
  onTap: () => void;
}

function MatchDateLabel({ match }: { match: Match }) {
  const { t, language } = useTranslation();
  if (match.status === "live") {
    return (
      <Badge variant='error'>
        <span className='badge__live-dot'>●</span> {t("MATCH_CARD_STATUS_LIVE")}
      </Badge>
    );
  }
  if (match.status === "finished") {
    return <Badge variant='default'>{t("MATCH_CARD_STATUS_FT")}</Badge>;
  }
  return (
    <span className='match-card__date'>
      {formatMatchDate(match.utcDate, language)}
    </span>
  );
}

function MatchTimeLabel({ match }: { match: Match }) {
  const { language } = useTranslation();
  if (match.status === "live") {
    return (
      <span className='match-card__time'>
        {getLiveMinute(match) ?? formatMatchTime(match.utcDate, language)}
      </span>
    );
  }
  return (
    <span className='match-card__time'>
      {formatMatchTime(match.utcDate, language)}
    </span>
  );
}

export default function MatchCard({ match, onTap }: Props) {
  const { t } = useTranslation();
  const isLive = match.status === "live";
  const stageLabelKey = getStageLabelKey(match.stage);
  return (
    <div
      className={`match-card${isLive ? " match-card--live" : ""}`}
      onClick={onTap}
      role='button'
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onTap()}
    >
      <div className='match-card__header'>
        <MatchDateLabel match={match} />
        <MatchTimeLabel match={match} />
      </div>

      <div className='match-card__group'>
        {stageLabelKey
          ? t(stageLabelKey)
          : `${t("MATCH_CARD_GROUP_PREFIX")} ${match.group}`}
      </div>

      <div className='match-card__score-row'>
        <div className='match-card__team'>
          <TeamFlag code={match.teamA} size={30} />
          <span className='match-card__team-name'>
            {match.teamA || t("TEAM_TBD")}
          </span>
        </div>
        <div className='match-card__score'>
          <span>{match.scoreA !== null ? match.scoreA : "–"}</span>
          <span className='match-card__score-sep'>:</span>
          <span>{match.scoreB !== null ? match.scoreB : "–"}</span>
        </div>
        <div className='match-card__team'>
          <TeamFlag code={match.teamB} size={30} />
          <span className='match-card__team-name'>
            {match.teamB || t("TEAM_TBD")}
          </span>
        </div>
      </div>

      {match.venue && (
        <div className='match-card__venue'>
          <span className='match-card__venue-name'>{match.venue}</span>
          {match.venueCity && (
            <span className='match-card__venue-city'>
              {match.venueCity}
              {match.venueCountry && `, ${TEAM_FULL[match.venueCountry]}`}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
