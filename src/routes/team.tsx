import { useParams } from 'react-router';
import TeamMatches from '~/components/TeamMatches';

export default function TeamRoute() {
  const { code } = useParams<{ code: string }>();
  return <TeamMatches code={code!} />;
}
