import './TopScorersTab.css';
import { useMemo } from 'react';
import { Link } from 'react-router';
import { useTranslation } from '~/hooks/useTranslation';
import { useAuth } from '~/lib/auth-context';
import TeamFlag from './TeamFlag';
import Avatar from './Avatar';
import type { Member, TopScorer, TopScorerPick } from '~/lib/types';

interface Props {
  scorers: TopScorer[];
  picks: TopScorerPick[];
  members: Member[];
  loading: boolean;
}

// Strip accents/punctuation and lowercase so names from different feeds
// (FIFA "Vinicius Junior" vs stored "Vinícius Júnior") still match.
function normalizeName(s: string): string {
  // NFD splits accented letters into base + combining mark; the final
  // [^a-z0-9] strip then drops the marks, leaving the plain ASCII base.
  return s
    .normalize('NFD')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export default function TopScorersTab({ scorers, picks, members, loading }: Props) {
  const { t, language } = useTranslation();
  const { user } = useAuth();

  const memberById = useMemo(() => {
    const m: Record<string, Member> = {};
    for (const member of members) m[member.userId] = member;
    return m;
  }, [members]);

  // Group each member's pick by normalized "name|team" so we can attach the
  // pickers to whichever ranked scorer they backed.
  const pickersByKey = useMemo(() => {
    const map: Record<string, Member[]> = {};
    for (const pick of picks) {
      const member = memberById[pick.userId];
      if (!member) continue;
      const key = `${normalizeName(pick.playerName)}|${pick.playerTeam.toLowerCase()}`;
      (map[key] ??= []).push(member);
    }
    return map;
  }, [picks, memberById]);

  if (loading) {
    return <div className="top-scorers__empty">{t('TOP_SCORERS_LOADING')}</div>;
  }

  if (scorers.length === 0) {
    return <div className="top-scorers__empty">{t('TOP_SCORERS_EMPTY')}</div>;
  }

  return (
    <div className="top-scorers">
      {scorers.map((s) => {
        const displayName = language === 'es' && s.nameEs ? s.nameEs : s.name;
        const key = `${normalizeName(s.name)}|${s.teamCode.toLowerCase()}`;
        const pickers = pickersByKey[key] ?? [];
        return (
          <div key={s.fifaPersonId} className="top-scorers__row">
            <span className="top-scorers__rank">{s.rank}</span>
            <TeamFlag code={s.teamCode} size={28} />
            <div className="top-scorers__player">
              <span className="top-scorers__name">{displayName}</span>
              <span className="top-scorers__team">{s.teamCode}</span>
            </div>

            <div className="top-scorers__pickers">
              {pickers.length === 0 ? (
                <span className="top-scorers__no-pickers">
                  {t('TOP_SCORERS_NO_PICKERS')}
                </span>
              ) : (
                pickers.map((m) => (
                  <Link
                    key={m.userId}
                    to={`/player/${m.userId}`}
                    className="top-scorers__picker"
                    title={m.userId === user?.id ? t('PROFILE_YOU') : m.displayName}
                  >
                    <Avatar name={m.displayName} color={m.avatarColor} size={24} />
                  </Link>
                ))
              )}
            </div>

            <span className="top-scorers__goals">
              {s.goals}
              <span className="top-scorers__goals-label">{t('TOP_SCORERS_GOALS')}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
