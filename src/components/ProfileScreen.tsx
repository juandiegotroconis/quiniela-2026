import { useAuth } from '~/lib/auth-context';
import PredictionEntryForm from './PredictionEntryForm';
import ProfileReadOnly from './ProfileReadOnly';
import type { UserPickEntry } from '~/lib/auth-context';
import type { TopScorerSuggestion } from '~/lib/mock-data';
import { useNavigate } from 'react-router';

export default function ProfileScreen() {
  const { submitted, userPicks, topScorer, submitPredictions, logout } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (picks: Record<number, UserPickEntry>, scorer: TopScorerSuggestion) => {
    await submitPredictions(picks, scorer);
    navigate('/rankings');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!submitted) {
    return <PredictionEntryForm onSubmit={handleSubmit} />;
  }

  return (
    <ProfileReadOnly
      userPicks={userPicks}
      topScorer={topScorer}
      onLogout={handleLogout}
    />
  );
}
