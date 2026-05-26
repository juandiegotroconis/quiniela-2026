import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { getClient } from "./client";
import {
  ensureMembership,
  fetchUserPicks,
  fetchUserTopScorer,
  checkSubmitted,
  submitAllPredictions,
  fetchUserQuinielId,
  lookupQuinielByCode,
} from "./queries";
import { AVATAR_COLORS } from "./mock-data";
import type { TopScorerSuggestion } from "./mock-data";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface UserPickEntry {
  pickA: string;
  pickB: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  quinielaId: string | null;
  needsQuiniela: boolean;
  submitted: boolean;
  userPicks: Record<number, UserPickEntry>;
  topScorer: TopScorerSuggestion | null;
  login: (email: string, password: string) => Promise<string | null>;
  signup: (email: string, password: string, name: string) => Promise<string | null>;
  logout: () => Promise<void>;
  joinWithCode: (code: string) => Promise<string | null>;
  submitPredictions: (
    picks: Record<number, UserPickEntry>,
    scorer: TopScorerSuggestion,
  ) => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function avatarColorForUser(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [quinielaId, setQuinielId] = useState<string | null>(null);
  const [needsQuiniela, setNeedsQuiniela] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [userPicks, setUserPicks] = useState<Record<number, UserPickEntry>>({});
  const [topScorer, setTopScorer] = useState<TopScorerSuggestion | null>(null);
  const client = getClient();

  useEffect(() => {
    let mounted = true;

    const loadUserData = async (userId: string, qId: string) => {
      const [sub, picks, scorer] = await Promise.all([
        checkSubmitted(userId, qId),
        fetchUserPicks(userId, qId),
        fetchUserTopScorer(userId, qId),
      ]);
      if (mounted) {
        setSubmitted(sub);
        setUserPicks(picks);
        setTopScorer(scorer);
      }
    };

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (session?.user) {
        const u = session.user;
        const name: string =
          u.user_metadata?.name ?? u.email?.split("@")[0] ?? "Player";
        setUser(prev => {
          if (prev?.id === u.id && prev?.email === (u.email ?? '') && prev?.name === name) return prev;
          return { id: u.id, email: u.email ?? '', name };
        });

        if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
          try {
            const qId = await fetchUserQuinielId(u.id);
            if (!mounted) return;

            if (!qId) {
              setNeedsQuiniela(true);
            } else {
              setQuinielId(qId);
              setNeedsQuiniela(false);
              await loadUserData(u.id, qId);
            }
          } catch (e) {
            console.error("Failed to load user data", e);
          }
        }
      } else {
        setUser(null);
        setQuinielId(null);
        setNeedsQuiniela(false);
        setSubmitted(false);
        setUserPicks({});
        setTopScorer(null);
      }

      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (
    email: string,
    password: string,
  ): Promise<string | null> => {
    const { error } = await getClient().auth.signInWithPassword({
      email,
      password,
    });
    return error ? error.message : null;
  };

  const signup = async (
    email: string,
    password: string,
    name: string,
  ): Promise<string | null> => {
    const { error } = await getClient().auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    return error ? error.message : null;
  };

  const logout = async () => {
    await getClient().auth.signOut();
  };

  const joinWithCode = async (code: string): Promise<string | null> => {
    if (!user) return "Not authenticated";
    try {
      const quiniela = await lookupQuinielByCode(code);
      if (!quiniela) return "Code not found. Please check and try again.";

      await ensureMembership(
        user.id,
        quiniela.id,
        user.name,
        avatarColorForUser(user.id),
      );
      const [sub, picks, scorer] = await Promise.all([
        checkSubmitted(user.id, quiniela.id),
        fetchUserPicks(user.id, quiniela.id),
        fetchUserTopScorer(user.id, quiniela.id),
      ]);
      setQuinielId(quiniela.id);
      setNeedsQuiniela(false);
      setSubmitted(sub);
      setUserPicks(picks);
      setTopScorer(scorer);
      return null;
    } catch (e: unknown) {
      return e instanceof Error ? e.message : "Failed to join quiniela";
    }
  };

  const submitPredictions = async (
    picks: Record<number, UserPickEntry>,
    scorer: TopScorerSuggestion,
  ): Promise<string | null> => {
    if (!user || !quinielaId) return "Not authenticated";
    try {
      await submitAllPredictions(user.id, quinielaId, picks, scorer);
      setUserPicks(picks);
      setTopScorer(scorer);
      setSubmitted(true);
      return null;
    } catch (e: unknown) {
      return e instanceof Error ? e.message : "Failed to submit predictions";
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        quinielaId,
        needsQuiniela,
        submitted,
        userPicks,
        topScorer,
        login,
        signup,
        logout,
        joinWithCode,
        submitPredictions,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
