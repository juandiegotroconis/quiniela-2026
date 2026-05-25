import './TeamFlag.css';
import { Icon } from '@iconify/react';
import { getTeamColor } from '~/lib/helpers';

const ISO2: Record<string, string> = {
  // Group A
  MEX: 'mx', RSA: 'za', KOR: 'kr', CZE: 'cz',
  // Group B
  CAN: 'ca', BIH: 'ba', QAT: 'qa', SUI: 'ch',
  // Group C
  BRA: 'br', MAR: 'ma', HAI: 'ht', SCO: 'gb-sct',
  // Group D
  USA: 'us', PAR: 'py', AUS: 'au', TUR: 'tr',
  // Group E
  GER: 'de', CUW: 'cw', CIV: 'ci', ECU: 'ec',
  // Group F
  NED: 'nl', JPN: 'jp', SWE: 'se', TUN: 'tn',
  // Group G
  BEL: 'be', EGY: 'eg', IRN: 'ir', NZL: 'nz',
  // Group H
  ESP: 'es', CPV: 'cv', KSA: 'sa', URY: 'uy',
  // Group I
  FRA: 'fr', SEN: 'sn', IRQ: 'iq', NOR: 'no',
  // Group J
  ARG: 'ar', ALG: 'dz', AUT: 'at', JOR: 'jo',
  // Group K
  POR: 'pt', COD: 'cd', UZB: 'uz', COL: 'co',
  // Group L
  ENG: 'gb-eng', CRO: 'hr', GHA: 'gh', PAN: 'pa',
};

interface Props {
  code: string;
  size?: number;
}

export default function TeamFlag({ code, size = 32 }: Props) {
  const iso2 = ISO2[code];

  if (iso2) {
    return (
      <Icon
        icon={`circle-flags:${iso2}`}
        width={size}
        height={size}
        className="team-flag-icon"
      />
    );
  }

  // Fallback for unmapped teams
  const bg = getTeamColor(code);
  const h = Math.round(size * 0.72);
  return (
    <div
      className={`team-flag${size < 30 ? ' team-flag--sm' : ''}`}
      style={{ width: size, height: h, background: bg }}
    >
      {code}
    </div>
  );
}
