import LeaderboardScreen from '~/components/LeaderboardScreen';

export function meta() {
  return [{ title: 'Rankings — FWC26 Quiniela' }];
}

export default function RankingsRoute() {
  return <LeaderboardScreen />;
}
