import './MatchCorrectionBanner.css';
import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { useTranslation } from '~/hooks/useTranslation';
import { fetchRecentMatchCorrections } from '~/lib/queries';
import { TEAM_FULL } from '~/lib/mock-data';
import type { MatchCorrection } from '~/lib/types';

const DISMISSED_KEY = 'DISMISSED_MATCH_CORRECTIONS';

function readDismissed(): number[] {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return raw ? (JSON.parse(raw) as number[]) : [];
  } catch {
    return [];
  }
}

function writeDismissed(ids: number[]) {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(ids));
  } catch {
    // localStorage unavailable
  }
}

export default function MatchCorrectionBanner() {
  const { t } = useTranslation();
  const [corrections, setCorrections] = useState<MatchCorrection[]>([]);

  useEffect(() => {
    fetchRecentMatchCorrections()
      .then((all) => {
        const dismissed = new Set(readDismissed());
        setCorrections(all.filter((c) => !dismissed.has(c.id)));
      })
      .catch(console.error);
  }, []);

  if (corrections.length === 0) return null;

  const handleDismiss = () => {
    const dismissed = new Set(readDismissed());
    for (const c of corrections) dismissed.add(c.id);
    writeDismissed([...dismissed]);
    setCorrections([]);
  };

  return (
    <div className='match-correction-banner' role='alert'>
      <Icon
        icon='mdi:alert-circle-outline'
        width={20}
        className='match-correction-banner__icon'
      />
      <div className='match-correction-banner__lines'>
        {corrections.map((c) => (
          <p key={c.id} className='match-correction-banner__line'>
            {t('CORRECTION_BANNER_PREFIX')}{' '}
            {TEAM_FULL[c.teamA] ?? c.teamA} {c.newScoreA}-{c.newScoreB}{' '}
            {TEAM_FULL[c.teamB] ?? c.teamB} ({t('CORRECTION_BANNER_WAS')}{' '}
            {c.oldScoreA}-{c.oldScoreB}). {t('CORRECTION_BANNER_SUFFIX')}
          </p>
        ))}
      </div>
      <button
        className='match-correction-banner__close'
        onClick={handleDismiss}
        aria-label='Close'
      >
        <Icon icon='mdi:close' width={16} />
      </button>
    </div>
  );
}
