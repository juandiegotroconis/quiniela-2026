import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { TopScorerSuggestion } from './mock-data';

export interface AuthUser {
  email: string;
  name: string;
}

export interface UserPickEntry {
  pickA: string;
  pickB: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  submitted: boolean;
  userPicks: Record<number, UserPickEntry>;
  topScorer: TopScorerSuggestion | null;
  login: (user: AuthUser) => void;
  logout: () => void;
  submitPredictions: (picks: Record<number, UserPickEntry>, scorer: TopScorerSuggestion) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function safeGet<T>(key: string): T | null {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [userPicks, setUserPicks] = useState<Record<number, UserPickEntry>>({});
  const [topScorer, setTopScorer] = useState<TopScorerSuggestion | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setUser(safeGet<AuthUser>('quiniela-user'));
    setSubmitted(!!localStorage.getItem('quiniela-submitted'));
    setUserPicks(safeGet<Record<number, UserPickEntry>>('quiniela-picks') ?? {});
    setTopScorer(safeGet<TopScorerSuggestion>('quiniela-topscorer'));
    setHydrated(true);
  }, []);

  const login = (u: AuthUser) => {
    localStorage.setItem('quiniela-user', JSON.stringify(u));
    setUser(u);
  };

  const logout = () => {
    localStorage.removeItem('quiniela-user');
    setUser(null);
  };

  const submitPredictions = (picks: Record<number, UserPickEntry>, scorer: TopScorerSuggestion) => {
    localStorage.setItem('quiniela-picks', JSON.stringify(picks));
    localStorage.setItem('quiniela-topscorer', JSON.stringify(scorer));
    localStorage.setItem('quiniela-submitted', 'true');
    setUserPicks(picks);
    setTopScorer(scorer);
    setSubmitted(true);
  };

  if (!hydrated) return null;

  return (
    <AuthContext.Provider value={{ user, submitted, userPicks, topScorer, login, logout, submitPredictions }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
