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
  fetchUserPicks,
  fetchUserTopScorer,
  checkSubmitted,
  submitAllPredictions,
  savePredictions as querySavePredictions,
  fetchUserMembershipInfo,
  updateAvatarColor as queryUpdateAvatarColor,
} from "./queries";
import { AVATAR_COLORS, type TopScorerSuggestion } from "./mock-data";

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
  quinielaVariant: string | null;
  userPicks: Record<number, UserPickEntry>;
  topScorer: TopScorerSuggestion | null;
  isPasswordRecovery: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  signup: (
    email: string,
    password: string,
    name: string,
  ) => Promise<string | null>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<string | null>;
  resetPassword: (newPassword: string) => Promise<string | null>;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [quinielaId, setQuinielId] = useState<string | null>(null);
  const [needsQuiniela, setNeedsQuiniela] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isUpdatable, setIsUpdatable] = useState(true);
  const [quinielaVariant, setQuinielaVariant] = useState<string | null>(null);
  const [userPicks, setUserPicks] = useState<Record<number, UserPickEntry>>({});
  const [topScorer, setTopScorer] = useState<TopScorerSuggestion | null>(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const loadedForUser = useRef<string | null>(null);
  const client = getClient();

  useEffect(() => {
    let mounted = true;

    const loadUserData = async (userId: string, qId: string) => {
      const [sub, picks, scorer] = await Promise.all([
        checkSubmitted(userId, qId),
        fetchUserPicks(userId, qId),
        fetchUserTopScorer(userId, qId),
      ]);
      if (!mounted) return;
      setSubmitted(sub);
      setUserPicks(picks);
      setTopScorer(scorer);
    };

    const loadAfterAuth = async (
      userId: string,
      userMeta?: Record<string, string>,
    ) => {
      try {
        const metaColor = userMeta?.avatar_color;
        if (metaColor) {
          await getClient()
            .from("profiles")
            .update({ avatar_color: metaColor })
            .eq("id", userId);
        }
        const membership = await fetchUserMembershipInfo(userId);
        if (!mounted) return;
        if (!membership) {
          setNeedsQuiniela(true);
          if (metaColor) setUser((prev) => prev ? { ...prev, avatarColor: metaColor } : prev);
        } else {
          setQuinielId(membership.quinielaId);
          setNeedsQuiniela(false);
          setIsUpdatable(membership.isUpdatable);
          setQuinielaVariant(membership.variant);
          setUser((prev) =>
            prev ? { ...prev, avatarColor: membership.avatarColor } : prev,
          );
          await loadUserData(userId, membership.quinielaId);
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

        if (event === "PASSWORD_RECOVERY") {
          setIsPasswordRecovery(true);
          setLoading(false);
          return;
        }

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
            if (mounted) loadAfterAuth(u.id, u.user_metadata as Record<string, string>);
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
        setQuinielaVariant(null);
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
    const avatar_color =
      AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
    const { error } = await getClient().auth.signUp({
      email,
      password,
      options: { data: { name, avatar_color } },
    });
    return error ? error.message : null;
  };

  const logout = async () => {
    await getClient().auth.signOut();
  };

  const forgotPassword = async (email: string): Promise<string | null> => {
    const { error } = await getClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return error ? error.message : null;
  };

  const resetPassword = async (newPassword: string): Promise<string | null> => {
    const { error } = await getClient().auth.updateUser({
      password: newPassword,
    });
    if (!error) setIsPasswordRecovery(false);
    return error ? error.message : null;
  };

  const joinWithCode = async (code: string): Promise<string | null> => {
    if (!user) return "Not authenticated";
    try {
      const { data, error } = await client
        .rpc("join_quiniela_by_code", { p_join_code: code })
        .select("*")
        .maybeSingle();
      if (error || !data) return error ? error.message : "Quiniela not found";

      const [sub, picks, scorer] = await Promise.all([
        checkSubmitted(user.id, data.quiniela_id),
        fetchUserPicks(user.id, data.quiniela_id),
        fetchUserTopScorer(user.id, data.quiniela_id),
      ]);
      setQuinielId(data.quiniela_id);
      setNeedsQuiniela(false);
      setSubmitted(sub);
      setUserPicks(picks);
      setTopScorer(scorer);
      setIsUpdatable(data.is_updatable);
      setQuinielaVariant(data.variant);
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
        quinielaVariant,
        userPicks,
        topScorer,
        isPasswordRecovery,
        login,
        signup,
        logout,
        forgotPassword,
        resetPassword,
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
