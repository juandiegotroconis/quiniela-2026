import './BenchSection.css';
import { useState } from 'react';
import { Link } from 'react-router';
import { Icon } from '@iconify/react';
import Avatar from './Avatar';
import Badge from './Badge';
import TeamFlag from './TeamFlag';
import { useTranslation } from '~/hooks/useTranslation';
import { isMatchupBonusEligible } from '~/lib/scoring';
import type { PredictionGroupPlayer } from '~/lib/helpers';

export interface BenchPlayer extends PredictionGroupPlayer {
  predHome: string | null;
  predAway: string | null;
  pickA: number;
  pickB: number;
}

interface PickGroup {
  key: string;
  predHome: string;
  predAway: string;
  pickA: number;
  pickB: number;
  players: BenchPlayer[];
}

function groupByPick(players: BenchPlayer[]): PickGroup[] {
  const map = new Map<string, PickGroup>();
  for (const p of players) {
    if (!p.predHome || !p.predAway) continue;
    const key = `${p.predHome}-${p.predAway}-${p.pickA}-${p.pickB}`;
    if (!map.has(key)) {
      map.set(key, { key, predHome: p.predHome, predAway: p.predAway, pickA: p.pickA, pickB: p.pickB, players: [] });
    }
    map.get(key)!.players.push(p);
  }
  return Array.from(map.values());
}

interface GroupProps {
  players: BenchPlayer[];
  label: string;
  bonus?: number;
  showPicks: boolean;
}

function PlayerGroup({ players, label, bonus, showPicks }: GroupProps) {
  const { t } = useTranslation();
  if (players.length === 0) return null;

  const pickGroups = groupByPick(players);

  return (
    <div className="bench-section__group">
      <div className="bench-section__group-label">
        {label}
        {bonus != null && <Badge variant="info">+{bonus}</Badge>}
      </div>

      {showPicks ? (
        <div className="bench-section__pick-cards">
          {pickGroups.map(pg => (
            <div key={pg.key} className="bench-section__pick-card">
              <div className="bench-section__pick-matchup">
                <TeamFlag code={pg.predHome} size={14} />
                <span className="bench-section__pick-score">{pg.pickA} - {pg.pickB}</span>
                <TeamFlag code={pg.predAway} size={14} />
              </div>
              <div className="bench-section__pick-avatars">
                {pg.players.map(p => (
                  <Link key={p.userId} to={`/player/${p.userId}`} title={p.displayName}>
                    <Avatar name={p.displayName} color={p.avatarColor} size={24} />
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bench-section__players">
          {players.map(p => (
            <Link key={p.userId} to={`/player/${p.userId}`} className="bench-section__player">
              <Avatar name={p.displayName} color={p.avatarColor} size={28} />
              <span className={`bench-section__player-name${p.isMe ? ' bench-section__player-name--me' : ''}`}>
                {p.isMe ? t('PROFILE_YOU') : p.displayName.split(' ')[0]}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

interface Props {
  partialPlayers: BenchPlayer[];
  missPlayers: BenchPlayer[];
  stage: string;
}

export default function BenchSection({ partialPlayers, missPlayers, stage }: Props) {
  const { t } = useTranslation();
  const [showPicks, setShowPicks] = useState(false);

  if (partialPlayers.length === 0 && missPlayers.length === 0) return null;

  const showBonus = isMatchupBonusEligible(stage, 0);

  return (
    <div className="bench-section">
      <div className="bench-section__header">
        <div className="bench-section__header-left">
          <Icon icon="mdi:seat-outline" width={14} />
          {t('MATCH_DETAIL_BENCH_LABEL')}
        </div>
        <button className="bench-section__toggle" onClick={() => setShowPicks(s => !s)}>
          {showPicks ? t('MATCH_DETAIL_BENCH_HIDE_PICKS') : t('MATCH_DETAIL_BENCH_SHOW_PICKS')}
        </button>
      </div>
      <div className="bench-section__body">
        <PlayerGroup
          players={partialPlayers}
          label={t('MATCH_DETAIL_BENCH_PARTIAL')}
          bonus={showBonus ? 1 : undefined}
          showPicks={showPicks}
        />
        <PlayerGroup
          players={missPlayers}
          label={t('MATCH_DETAIL_BENCH_MISS')}
          showPicks={showPicks}
        />
      </div>
      <div className="bench-section__plank" />
    </div>
  );
}
