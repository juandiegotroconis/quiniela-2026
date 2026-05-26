import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { fetchMatches, fetchMembers } from './queries';
import { useAuth } from './auth-context';
import type { Match, Member } from './types';

interface DataContextValue {
  matches: Match[];
  matchesLoading: boolean;
  members: Member[];
  membersLoading: boolean;
  refreshMembers: () => Promise<void>;
  getMember: (userId: string) => Member | undefined;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { user, quinielaId } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  useEffect(() => {
    fetchMatches()
      .then(setMatches)
      .catch(console.error)
      .finally(() => setMatchesLoading(false));
  }, []);

  const loadMembers = async (qId: string) => {
    setMembersLoading(true);
    try {
      setMembers(await fetchMembers(qId));
    } catch (e) {
      console.error(e);
    } finally {
      setMembersLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.id || !quinielaId) return;
    let cancelled = false;
    setMembersLoading(true);
    fetchMembers(quinielaId)
      .then(data => { if (!cancelled) setMembers(data); })
      .catch(console.error)
      .finally(() => { if (!cancelled) setMembersLoading(false); });
    return () => { cancelled = true; };
  }, [user?.id, quinielaId]);

  const getMember = (userId: string) => members.find(m => m.userId === userId);

  const refreshMembers = async () => {
    if (quinielaId) await loadMembers(quinielaId);
  };

  return (
    <DataContext.Provider value={{ matches, matchesLoading, members, membersLoading, refreshMembers, getMember }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}
