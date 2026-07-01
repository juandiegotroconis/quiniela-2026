import './WhatIfLeaderboard.css';
import { useTranslation } from '~/hooks/useTranslation';
import Avatar from './Avatar';
import Badge from './Badge';
import PositionChange from './PositionChange';
import { getMainResult, getMainResultPoints } from '~/lib/scoring';
import { getResultVariant } from '~/lib/helpers';
import type { MainResult } from '~/lib/scoring';
import type { Match, Member, MatchPrediction } from '~/lib/types';

interface SnapshotEntry {
  cumulativePts: number;
  rankAtMoment: number;
}

interface Props {
  match: Match;
  members: Member[];
  preds: MatchPrediction[];
  myUserId: string | null;
  snapshot?: Map<string, SnapshotEntry>;
}

interface ProjectedRow {
  userId: string;
  displayName: string;
  avatarColor: string;
  currentRank: number;
  projectedRank: number;
  currentPts: number;
  projectedPts: number;
  delta: number;
  result: MainResult | null;
}

export default function WhatIfLeaderboard({ match, members, preds, myUserId, snapshot }: Props) {
  const { t } = useTranslation();

  if (members.length === 0 || preds.length === 0) return null;

  const matchResult = {
    stage: match.stage,
    scoreHomeRegular: match.scoreA,
    scoreAwayRegular: match.scoreB,
    scoreHomeEt: match.scoreAEt,
    scoreAwayEt: match.scoreBEt,
    winner: match.winner,
    homeTeamCode: match.teamA,
    awayTeamCode: match.teamB,
  };

  const predsByUser = new Map(preds.map((p) => [p.userId, p]));
  const isFinished = match.status === 'finished';
  const hasSnapshot = isFinished && snapshot && snapshot.size > 0;

  const rows: ProjectedRow[] = members.map((m) => {
    const pred = predsByUser.get(m.userId);
    const result = pred
      ? getMainResult(matchResult, {
          pickHome: pred.pickA,
          pickAway: pred.pickB,
          pickPenaltiesWinner: pred.pickPenaltiesWinner,
        })
      : null;
    const delta = getMainResultPoints(result);
    const snap = hasSnapshot ? snapshot!.get(m.userId) : undefined;
    const projectedPts = snap ? snap.cumulativePts : isFinished ? m.pts : m.pts + delta;
    const snapshotRank = snap?.rankAtMoment ?? m.rank;
    return {
      userId: m.userId,
      displayName: m.displayName,
      avatarColor: m.avatarColor,
      currentRank: snapshotRank,
      projectedRank: 0,
      currentPts: m.pts,
      projectedPts,
      delta,
      result,
    };
  });

  rows.sort((a, b) => b.projectedPts - a.projectedPts);
  rows.forEach((r, i) => { r.projectedRank = i + 1; });

  return (
    <div className="whatif-leaderboard">
      <div className="whatif-leaderboard__heading">
        {isFinished ? t('MATCH_DETAIL_RESULT_TITLE') : t('MATCH_DETAIL_WHATIF_TITLE')}
      </div>
      <p className="whatif-leaderboard__subtitle">
        {isFinished ? t('MATCH_DETAIL_RESULT_SUBTITLE') : t('MATCH_DETAIL_WHATIF_SUBTITLE')}
      </p>

      <div className="whatif-leaderboard__list">
        {rows.map((r) => (
          <div
            key={r.userId}
            className={`whatif-leaderboard__row${r.userId === myUserId ? ' whatif-leaderboard__row--me' : ''}`}
          >
            <span className="whatif-leaderboard__rank">{r.projectedRank}</span>
            <PositionChange current={r.projectedRank} previous={r.currentRank || r.projectedRank} />
            <Avatar name={r.displayName} color={r.avatarColor} size={28} />
            <span className="whatif-leaderboard__name">
              {r.userId === myUserId ? t('PROFILE_YOU') : r.displayName}
            </span>
            {r.delta > 0 && (
              <Badge variant={getResultVariant(r.result)}>+{r.delta}</Badge>
            )}
            <span className="whatif-leaderboard__pts">{r.projectedPts}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
