import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { getClient } from "./client";
import {
  ensureMembership,
  fetchUserPicks,
  fetchUserTopScorer,
  fetchUserAvatarColor,
  checkSubmitted,
  submitAllPredictions,
  savePredictions as querySavePredictions,
  fetchUserQuinielId,
  lookupQuinielByCode,
  fetchQuinielaIsUpdatable,
  updateAvatarColor as queryUpdateAvatarColor,
} from "./queries";
import { AVATAR_COLORS } from "./mock-data";
import type { TopScorerSuggestion } from "./mock-data";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarColor: string | null;
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
  isUpdatable: boolean;
  userPicks: Record<number, UserPickEntry>;
  topScorer: TopScorerSuggestion | null;
  login: (email: string, password: string) => Promise<string | null>;
  signup: (
    email: string,
    password: string,
    name: string,
  ) => Promise<string | null>;
  logout: () => Promise<void>;
  joinWithCode: (code: string) => Promise<string | null>;
  savePredictions: (
    picks: Record<number, UserPickEntry>,
    scorer: TopScorerSuggestion | null,
  ) => Promise<string | null>;
  submitPredictions: (
    picks: Record<number, UserPickEntry>,
    scorer: TopScorerSuggestion,
  ) => Promise<string | null>;
  updateAvatarColor: (color: string) => Promise<string | null>;
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
  const [isUpdatable, setIsUpdatable] = useState(true);
  const [userPicks, setUserPicks] = useState<Record<number, UserPickEntry>>({});
  const [topScorer, setTopScorer] = useState<TopScorerSuggestion | null>(null);
  const loadedForUser = useRef<string | null>(null);
  const client = getClient();

  useEffect(() => {
    let mounted = true;

    const loadUserData = async (userId: string, qId: string) => {
      const [sub, picks, scorer, updatable, avatarColor] = await Promise.all([
        checkSubmitted(userId, qId),
        fetchUserPicks(userId, qId),
        fetchUserTopScorer(userId, qId),
        fetchQuinielaIsUpdatable(qId),
        fetchUserAvatarColor(userId, qId),
      ]);
      if (!mounted) return;
      setSubmitted(sub);
      setUserPicks(picks);
      setTopScorer(scorer);
      setIsUpdatable(updatable);
      setUser((prev) => (prev ? { ...prev, avatarColor } : prev));
    };

    const loadAfterAuth = async (userId: string) => {
      try {
        const qId = await fetchUserQuinielId(userId);
        if (!mounted) return;
        if (!qId) {
          setNeedsQuiniela(true);
        } else {
          setQuinielId(qId);
          setNeedsQuiniela(false);
          await loadUserData(userId, qId);
        }
      } catch (e) {
        console.error("Failed to load user data", e);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (session?.user) {
        const u = session.user;
        const name: string =
          u.user_metadata?.name ?? u.email?.split("@")[0] ?? "Player";
        setUser((prev) => {
          if (
            prev?.id === u.id &&
            prev?.email === (u.email ?? "") &&
            prev?.name === name
          )
            return prev;
          return {
            id: u.id,
            email: u.email ?? "",
            name,
            avatarColor: prev?.avatarColor ?? null,
          };
        });

        if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
          // Supabase re-fires SIGNED_IN on tab focus; only load once per user.
          if (loadedForUser.current === u.id) {
            setLoading(false);
            return;
          }
          loadedForUser.current = u.id;
          // Defer DB calls outside the auth-lock callback to avoid a deadlock
          // that hangs every later query until the page is refreshed.
          setTimeout(() => {
            if (mounted) loadAfterAuth(u.id);
          }, 0);
        } else {
          setLoading(false);
        }
      } else {
        loadedForUser.current = null;
        setUser(null);
        setQuinielId(null);
        setNeedsQuiniela(false);
        setSubmitted(false);
        setIsUpdatable(true);
        setUserPicks({});
        setTopScorer(null);
        setLoading(false);
      }
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
      const [sub, picks, scorer, updatable] = await Promise.all([
        checkSubmitted(user.id, quiniela.id),
        fetchUserPicks(user.id, quiniela.id),
        fetchUserTopScorer(user.id, quiniela.id),
        fetchQuinielaIsUpdatable(quiniela.id),
      ]);
      setQuinielId(quiniela.id);
      setNeedsQuiniela(false);
      setSubmitted(sub);
      setUserPicks(picks);
      setTopScorer(scorer);
      setIsUpdatable(updatable);
      return null;
    } catch (e: unknown) {
      return e instanceof Error ? e.message : "Failed to join quiniela";
    }
  };

  const savePredictions = async (
    picks: Record<number, UserPickEntry>,
    scorer: TopScorerSuggestion | null,
  ): Promise<string | null> => {
    if (!user || !quinielaId) return "Not authenticated";
    try {
      await querySavePredictions(user.id, quinielaId, picks, scorer);
      setUserPicks(picks);
      if (scorer) setTopScorer(scorer);
      return null;
    } catch (e: unknown) {
      return e instanceof Error ? e.message : "Failed to save predictions";
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

  const updateAvatarColor = async (color: string): Promise<string | null> => {
    if (!user || !quinielaId) return "Not authenticated";
    try {
      await queryUpdateAvatarColor(user.id, quinielaId, color);
      setUser((prev) => (prev ? { ...prev, avatarColor: color } : prev));
      return null;
    } catch (e: unknown) {
      return e instanceof Error ? e.message : "Failed to update color";
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
        isUpdatable,
        userPicks,
        topScorer,
        login,
        signup,
        logout,
        joinWithCode,
        savePredictions,
        submitPredictions,
        updateAvatarColor,
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
