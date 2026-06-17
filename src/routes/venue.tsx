import { useParams } from 'react-router';
import VenueMatches from '~/components/VenueMatches';

export default function VenueRoute() {
  const { venue } = useParams<{ venue: string }>();
  return <VenueMatches venue={decodeURIComponent(venue!)} />;
}
