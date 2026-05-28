import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { fetchMatches, fetchMembersCore, fetchUserPicks } from './queries';
import { useAuth } from './auth-context';
import type { Match, Member } from './types';
import type { UserPickEntry } from './auth-context';

interface DataContextValue {
  matches: Match[];
  matchesLoading: boolean;
  members: Member[];
  membersLoading: boolean;
  refreshMembers: () => Promise<void>;
  getMember: (userId: string) => Member | undefined;
  getPicksForUser: (userId: string, quinielaId: string) => Promise<Record<number, UserPickEntry>>;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { user, quinielaId } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const picksCache = useRef<Map<string, Record<number, UserPickEntry>>>(new Map());

  useEffect(() => {
    fetchMatches()
      .then(setMatches)
      .catch(console.error)
      .finally(() => setMatchesLoading(false));
  }, []);

  const loadMembers = async (qId: string) => {
    setMembersLoading(true);
    try {
      setMembers(await fetchMembersCore(qId));
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
    fetchMembersCore(quinielaId)
      .then(data => { if (!cancelled) setMembers(data); })
      .catch(console.error)
      .finally(() => { if (!cancelled) setMembersLoading(false); });
    return () => { cancelled = true; };
  }, [user?.id, quinielaId]);

  const getMember = (userId: string) => members.find(m => m.userId === userId);

  const refreshMembers = async () => {
    if (quinielaId) await loadMembers(quinielaId);
  };

  const getPicksForUser = useCallback(async (userId: string, qId: string): Promise<Record<number, UserPickEntry>> => {
    const key = `${userId}:${qId}`;
    if (picksCache.current.has(key)) return picksCache.current.get(key)!;
    const picks = await fetchUserPicks(userId, qId);
    picksCache.current.set(key, picks);
    return picks;
  }, []);

  return (
    <DataContext.Provider value={{ matches, matchesLoading, members, membersLoading, refreshMembers, getMember, getPicksForUser }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}
