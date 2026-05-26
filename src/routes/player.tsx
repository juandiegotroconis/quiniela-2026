import { useParams } from 'react-router';
import PlayerProfile from '~/components/PlayerProfile';

export default function PlayerRoute() {
  const { id } = useParams<{ id: string }>();
  return <PlayerProfile userId={id!} />;
}
