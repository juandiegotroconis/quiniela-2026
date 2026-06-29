import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import type { PasskeyListItem } from "@supabase/supabase-js";
import { getClient } from "./client";
import {
  fetchUserPicks,
  fetchUserTopScorer,
  fetchUserBracketPicks,
  fetchMemberGrace,
  checkSubmitted,
  submitAllPredictions,
  savePredictions as querySavePredictions,
  fetchUserMembershipInfo,
  fetchUserQuinielas,
  setActiveQuiniela as querySetActiveQuiniela,
  updateAvatarColor as queryUpdateAvatarColor,
  type UserQuiniela,
  type BracketPickEntry,
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
  pickPenaltiesWinner: string | null;
}

export type { BracketPickEntry };

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  quinielaId: string | null;
  needsQuiniela: boolean;
  submitted: boolean;
  isUpdatable: boolean;
  quinielaVariant: string | null;
  knockoutMode: string;
  graceUntil: string | null;
  userPicks: Record<number, UserPickEntry>;
  bracketPicks: Record<number, BracketPickEntry>;
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
  listUserQuinielas: () => Promise<UserQuiniela[]>;
  switchQuiniela: (quinielaId: string) => Promise<string | null>;
  signInWithPasskey: () => Promise<string | null>;
  registerPasskey: () => Promise<string | null>;
  listPasskeys: () => Promise<PasskeyListItem[]>;
  deletePasskey: (passkeyId: string) => Promise<string | null>;
  savePredictions: (
    picks: Record<number, UserPickEntry>,
    scorer: TopScorerSuggestion | null,
    bracketPicks?: Record<number, BracketPickEntry>,
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
  const [knockoutMode, setKnockoutMode] = useState<string>("STAGE_BY_STAGE");
  const [graceUntil, setGraceUntil] = useState<string | null>(null);
  const [userPicks, setUserPicks] = useState<Record<number, UserPickEntry>>({});
  const [bracketPicks, setBracketPicks] = useState<Record<number, BracketPickEntry>>({});
  const [topScorer, setTopScorer] = useState<TopScorerSuggestion | null>(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const loadedForUser = useRef<string | null>(null);
  const client = getClient();

  useEffect(() => {
    let mounted = true;

    const loadUserData = async (userId: string, qId: string) => {
      const [sub, picks, scorer, bracket, grace] = await Promise.all([
        checkSubmitted(userId, qId),
        fetchUserPicks(userId, qId),
        fetchUserTopScorer(userId, qId),
        fetchUserBracketPicks(userId, qId),
        fetchMemberGrace(userId, qId),
      ]);
      if (!mounted) return;
      setSubmitted(sub);
      setUserPicks(picks);
      setTopScorer(scorer);
      setBracketPicks(bracket);
      setGraceUntil(grace);
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
        const membership = await fetchUserMembershipInfo();
        if (!mounted) return;
        if (!membership) {
          setNeedsQuiniela(true);
          if (metaColor) setUser((prev) => prev ? { ...prev, avatarColor: metaColor } : prev);
        } else {
          setQuinielId(membership.quinielaId);
          setNeedsQuiniela(false);
          setIsUpdatable(membership.isUpdatable);
          setQuinielaVariant(membership.variant);
          setKnockoutMode(membership.knockoutMode);
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
        setKnockoutMode("STAGE_BY_STAGE");
        setGraceUntil(null);
        setUserPicks({});
        setBracketPicks({});
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

  const signInWithPasskey = async (): Promise<string | null> => {
    const { error } = await getClient().auth.signInWithPasskey();
    return error ? error.message : null;
  };

  const registerPasskey = async (): Promise<string | null> => {
    const { error } = await getClient().auth.registerPasskey();
    return error ? error.message : null;
  };

  const listPasskeys = async (): Promise<PasskeyListItem[]> => {
    const { data, error } = await getClient().auth.passkey.list();
    if (error) throw error;
    return data;
  };

  const deletePasskey = async (passkeyId: string): Promise<string | null> => {
    const { error } = await getClient().auth.passkey.delete({ passkeyId });
    return error ? error.message : null;
  };

  const joinWithCode = async (code: string): Promise<string | null> => {
    if (!user) return "Not authenticated";
    try {
      const { data: rawData, error } = await client
        .rpc("join_quiniela_by_code", { p_join_code: code })
        .select("*")
        .maybeSingle();
      if (error || !rawData) return error ? error.message : "Quiniela not found";
      const data = rawData;

      const [sub, picks, scorer, bracket, grace] = await Promise.all([
        checkSubmitted(user.id, data.quiniela_id),
        fetchUserPicks(user.id, data.quiniela_id),
        fetchUserTopScorer(user.id, data.quiniela_id),
        fetchUserBracketPicks(user.id, data.quiniela_id),
        fetchMemberGrace(user.id, data.quiniela_id),
      ]);
      setQuinielId(data.quiniela_id);
      setNeedsQuiniela(false);
      setSubmitted(sub);
      setUserPicks(picks);
      setTopScorer(scorer);
      setBracketPicks(bracket);
      setGraceUntil(grace);
      setIsUpdatable(data.is_updatable);
      setQuinielaVariant(data.variant);
      setKnockoutMode(data.knockout_mode);
      return null;
    } catch (e: unknown) {
      return e instanceof Error ? e.message : "Failed to join quiniela";
    }
  };

  const listUserQuinielas = async (): Promise<UserQuiniela[]> => {
    return fetchUserQuinielas();
  };

  const switchQuiniela = async (
    newQuinielaId: string,
  ): Promise<string | null> => {
    if (!user) return "Not authenticated";
    try {
      const membership = await querySetActiveQuiniela(newQuinielaId);
      const [sub, picks, scorer, bracket, grace] = await Promise.all([
        checkSubmitted(user.id, membership.quinielaId),
        fetchUserPicks(user.id, membership.quinielaId),
        fetchUserTopScorer(user.id, membership.quinielaId),
        fetchUserBracketPicks(user.id, membership.quinielaId),
        fetchMemberGrace(user.id, membership.quinielaId),
      ]);
      setQuinielId(membership.quinielaId);
      setSubmitted(sub);
      setUserPicks(picks);
      setTopScorer(scorer);
      setBracketPicks(bracket);
      setGraceUntil(grace);
      setIsUpdatable(membership.isUpdatable);
      setQuinielaVariant(membership.variant);
      setKnockoutMode(membership.knockoutMode);
      setUser((prev) =>
        prev ? { ...prev, avatarColor: membership.avatarColor } : prev,
      );
      return null;
    } catch (e: unknown) {
      return e instanceof Error ? e.message : "Failed to switch quiniela";
    }
  };

  const savePredictions = async (
    picks: Record<number, UserPickEntry>,
    scorer: TopScorerSuggestion | null,
    newBracketPicks: Record<number, BracketPickEntry> = {},
  ): Promise<string | null> => {
    if (!user || !quinielaId) return "Not authenticated";
    try {
      await querySavePredictions(user.id, quinielaId, picks, scorer, newBracketPicks);
      setUserPicks(picks);
      if (scorer) setTopScorer(scorer);
      setBracketPicks(newBracketPicks);
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
        knockoutMode,
        graceUntil,
        userPicks,
        bracketPicks,
        topScorer,
        isPasswordRecovery,
        login,
        signup,
        logout,
        forgotPassword,
        resetPassword,
        joinWithCode,
        listUserQuinielas,
        switchQuiniela,
        signInWithPasskey,
        registerPasskey,
        listPasskeys,
        deletePasskey,
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
