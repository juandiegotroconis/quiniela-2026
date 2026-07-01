import "./MatchEventTimeline.css";
import { useState } from "react";
import { Icon } from "@iconify/react";
import { useTranslation } from "~/hooks/useTranslation";
import type { Match, MatchEvent } from "~/lib/types";

const GOAL_TYPES = new Set<MatchEvent["type"]>(["goal", "own_goal"]);

function EventContent({ event }: { event: MatchEvent }) {
  const { t } = useTranslation();

  if (event.type === "substitution") {
    return (
      <div className='met__content'>
        {event.secondaryName && (
          <span className='met__line'>
            <Icon
              icon='mdi:arrow-right-bold'
              width={13}
              className='met__arrow met__arrow--out'
            />
            <span className='met__name met__name--muted'>
              {event.secondaryName}
            </span>
          </span>
        )}
        <span className='met__line'>
          <Icon
            icon='mdi:arrow-right-bold'
            width={13}
            className='met__arrow met__arrow--in'
          />
          <span className='met__name'>{event.playerName}</span>
        </span>
      </div>
    );
  }

  if (GOAL_TYPES.has(event.type)) {
    return (
      <div className='met__content'>
        <span className='met__line'>
          <Icon icon='mdi:soccer' width={16} className='met__goal-icon' />
          <span className='met__name'>
            {event.playerName}
            {event.type === "own_goal" && (
              <span className='met__og'> ({t("MATCH_EVENT_OWN_GOAL_TAG")})</span>
            )}
          </span>
        </span>
        {event.secondaryName && (
          <span className='met__assist'>
            {t("MATCH_EVENT_ASSIST")}: {event.secondaryName}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className='met__content'>
      <span className='met__line'>
        <span className={`met__card met__card--${event.type}`} />
        <span className='met__name'>{event.playerName}</span>
      </span>
    </div>
  );
}

interface Props {
  match: Match;
  events: MatchEvent[];
}

export default function MatchEventTimeline({ match, events }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);

  if (events.length === 0) return null;

  return (
    <div className='met'>
      <button className='met__heading' onClick={() => setOpen(o => !o)}>
        {t("MATCH_EVENT_TIMELINE_HEADING")}
        <Icon icon={open ? 'mdi:chevron-up' : 'mdi:chevron-down'} width={16} />
      </button>

      {open && (
        <ol className='met__list'>
          {match.status === "finished" && (
            <li className='met__row'>
              <div className='met__side met__side--left' />
              <div className='met__center'>
                <Icon icon='mdi:whistle' width={18} className='met__whistle' />
              </div>
              <div className='met__side met__side--right' />
            </li>
          )}
          {events
            .slice()
            .reverse()
            .map((event) => {
              const isAway = event.teamCode === match.teamB;
              return (
                <li
                  key={event.id}
                  className={`met__row met__row--${isAway ? "away" : "home"}`}
                >
                  <div className='met__side met__side--left'>
                    {!isAway && <EventContent event={event} />}
                  </div>
                  <div className='met__center'>
                    {event.minute ? (
                      <span className='met__minute'>{event.minute}</span>
                    ) : (
                      <span className='met__dot' />
                    )}
                  </div>
                  <div className='met__side met__side--right'>
                    {isAway && <EventContent event={event} />}
                  </div>
                </li>
              );
            })}
        </ol>
      )}
    </div>
  );
}
