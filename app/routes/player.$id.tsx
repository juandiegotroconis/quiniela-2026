import { useParams } from 'react-router';
import PlayerProfile from '~/components/PlayerProfile';

export function meta() {
  return [{ title: 'Player Profile — FWC26 Quiniela' }];
}

export default function PlayerRoute() {
  const { id } = useParams<{ id: string }>();
  return <PlayerProfile playerId={Number(id)} />;
}
