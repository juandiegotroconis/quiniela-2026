import "./ProfileScreen.css";
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { Icon } from "@iconify/react";
import type { PasskeyListItem } from "@supabase/supabase-js";
import { useAuth } from "~/lib/auth-context";
import { useData } from "~/lib/data-context";
import { useTranslation } from "~/hooks/useTranslation";
import { useTheme } from "~/hooks/useTheme";
import PageContainer from "./PageContainer";
import Avatar from "./Avatar";
import PositionChange from "./PositionChange";
import PredictionEntryForm from "./PredictionEntryForm";
import ProfileReadOnly from "./ProfileReadOnly";
import { AVATAR_COLORS } from "~/lib/mock-data";
import type { BracketPickEntry, UserPickEntry } from "~/lib/auth-context";
import type { TopScorerSuggestion } from "~/lib/mock-data";
import type { UserQuiniela } from "~/lib/queries";

const passkeysSupported =
  typeof window !== "undefined" && "PublicKeyCredential" in window;

export default function ProfileScreen() {
  const {
    user,
    quinielaId,
    isUpdatable,
    knockoutMode,
    userPicks,
    bracketPicks,
    topScorer,
    savePredictions,
    submitPredictions,
    updateAvatarColor,
    logout,
    registerPasskey,
    listPasskeys,
    deletePasskey,
    listUserQuinielas,
    switchQuiniela,
  } = useAuth();
  const { getMember } = useData();
  const navigate = useNavigate();
  const me = user ? getMember(user.id) : undefined;

  const [activeColor, setActiveColor] = useState(
    me?.avatarColor ?? AVATAR_COLORS[0],
  );
  const [colorSaving, setColorSaving] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [passkeys, setPasskeys] = useState<PasskeyListItem[]>([]);
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  const [passkeyError, setPasskeyError] = useState("");
  const [quinielas, setQuinielas] = useState<UserQuiniela[] | null>(null);
  const [quinielaSwitching, setQuinielaSwitching] = useState(false);
  const [quinielaError, setQuinielaError] = useState("");

  useEffect(() => {
    if (!settingsOpen || quinielas !== null) return;
    listUserQuinielas()
      .then(setQuinielas)
      .catch((e: unknown) =>
        setQuinielaError(e instanceof Error ? e.message : String(e)),
      );
  }, [settingsOpen, quinielas, listUserQuinielas]);

  const handleSwitchQuiniela = async (id: string) => {
    if (id === quinielaId) return;
    setQuinielaError("");
    setQuinielaSwitching(true);
    const err = await switchQuiniela(id);
    setQuinielaSwitching(false);
    if (err) setQuinielaError(err);
  };

  const refreshPasskeys = useCallback(async () => {
    try {
      setPasskeys(await listPasskeys());
    } catch (e: unknown) {
      setPasskeyError(e instanceof Error ? e.message : String(e));
    }
  }, [listPasskeys]);

  useEffect(() => {
    if (passkeysSupported) refreshPasskeys();
  }, [refreshPasskeys]);

  const handleAddPasskey = async () => {
    setPasskeyError("");
    setPasskeyBusy(true);
    const err = await registerPasskey();
    setPasskeyBusy(false);
    if (err) {
      setPasskeyError(err);
      return;
    }
    await refreshPasskeys();
  };

  const handleDeletePasskey = async (passkeyId: string) => {
    setPasskeyError("");
    setPasskeyBusy(true);
    const err = await deletePasskey(passkeyId);
    setPasskeyBusy(false);
    if (err) {
      setPasskeyError(err);
      return;
    }
    await refreshPasskeys();
  };

  const handleColorChange = async (color: string) => {
    setActiveColor(color);
    setColorSaving(true);
    await updateAvatarColor(color);
    setColorSaving(false);
  };

  const handleSave = async (
    picks: Record<number, UserPickEntry>,
    scorer: TopScorerSuggestion | null,
    newBracketPicks: Record<number, BracketPickEntry>,
  ) => {
    await savePredictions(picks, scorer, newBracketPicks);
  };

  const handleSubmit = async (
    picks: Record<number, UserPickEntry>,
    scorer: TopScorerSuggestion,
  ) => {
    await submitPredictions(picks, scorer);
    navigate("/rankings");
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const { t, language, setLanguage } = useTranslation();
  const { theme, setTheme } = useTheme();
  const showForm = isUpdatable;

  return (
    <>
      <PageContainer>
        <div className='profile-hdr'>
          <Avatar
            name={user?.name ?? t("PROFILE_YOU")}
            color={activeColor}
            size={64}
          />
          <div className='profile-hdr__info'>
            <div className='profile-hdr__name'>
              {user?.name ?? t("PROFILE_DEFAULT_NAME")}
            </div>
            <div className='profile-hdr__rank-row'>
              {me && (
                <>
                  <span className='profile-hdr__rank-label'>
                    {t("PROFILE_RANK_LABEL")}{" "}
                    <span className='profile-hdr__rank-num'>
                      #{me.rank ?? "—"}
                    </span>
                  </span>
                  <PositionChange
                    current={me.rank}
                    previous={me.prevRank ?? me.rank}
                  />
                  <span className='profile-hdr__pts'>{me.pts ?? 0} pts</span>
                  {me.currentStreak !== 0 && (
                    <span className='profile-hdr__streak'>
                      {me.currentStreak > 0 ? "🔥" : "🥶"}{" "}
                      {Math.abs(me.currentStreak)}{" "}
                      {t("RANKINGS_STREAK_IN_A_ROW")}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
          <button className='profile-hdr__logout' onClick={handleLogout}>
            {t("PROFILE_LOG_OUT")}
          </button>
        </div>

        <div className='profile-hdr__settings'>
          <button
            type='button'
            className='profile-hdr__settings-toggle'
            onClick={() => setSettingsOpen((open) => !open)}
            aria-expanded={settingsOpen}
          >
            <Icon icon='mdi:cog-outline' width={18} height={18} />
            <span>{t("PROFILE_SETTINGS_LABEL")}</span>
            <Icon
              className='profile-hdr__settings-chevron'
              icon='mdi:chevron-down'
              width={20}
              height={20}
              style={{
                transform: settingsOpen ? "rotate(180deg)" : undefined,
              }}
            />
          </button>

          {settingsOpen && (
            <div className='profile-hdr__settings-body'>
              <div className='profile-hdr__color-picker'>
                <span className='profile-hdr__color-label'>
                  {colorSaving
                    ? t("PROFILE_AVATAR_COLOR_SAVING")
                    : t("PROFILE_AVATAR_COLOR_LABEL")}
                </span>
                <div className='profile-hdr__color-swatches'>
                  {AVATAR_COLORS.map((color) => (
                    <button
                      key={color}
                      className={`profile-hdr__color-swatch${activeColor === color ? " profile-hdr__color-swatch--active" : ""}`}
                      style={{ background: color }}
                      onClick={() => handleColorChange(color)}
                      aria-label={color}
                    />
                  ))}
                </div>
              </div>

              <div className='profile-hdr__lang-picker'>
                <span className='profile-hdr__color-label'>
                  {t("PROFILE_LANGUAGE_LABEL")}
                </span>
                <div className='profile-hdr__lang-options'>
                  {(
                    [
                      { code: "en", flag: "circle-flags:us", label: "English" },
                      { code: "es", flag: "circle-flags:es", label: "Español" },
                    ] as const
                  ).map(({ code, flag, label }) => (
                    <button
                      key={code}
                      className={`profile-hdr__lang-opt${language === code ? " profile-hdr__lang-opt--active" : ""}`}
                      onClick={() => setLanguage(code)}
                      aria-pressed={language === code}
                    >
                      <Icon icon={flag} width={20} height={20} />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className='profile-hdr__theme-picker'>
                <span className='profile-hdr__color-label'>
                  {t("PROFILE_THEME_LABEL")}
                </span>
                <div className='profile-hdr__theme-options'>
                  {(
                    [
                      {
                        value: "light",
                        icon: "mdi:white-balance-sunny",
                        label: t("PROFILE_THEME_LIGHT"),
                      },
                      {
                        value: "dark",
                        icon: "mdi:weather-night",
                        label: t("PROFILE_THEME_DARK"),
                      },
                    ] as const
                  ).map(({ value, icon, label }) => (
                    <button
                      key={value}
                      className={`profile-hdr__theme-opt${theme === value ? " profile-hdr__theme-opt--active" : ""}`}
                      onClick={() => setTheme(value)}
                      aria-pressed={theme === value}
                    >
                      <Icon icon={icon} width={20} height={20} />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {quinielas && quinielas.length > 1 && (
                <div className='profile-hdr__quiniela-picker'>
                  <span className='profile-hdr__color-label'>
                    {t("PROFILE_QUINIELA_LABEL")}
                  </span>
                  <div className='profile-hdr__quiniela-options'>
                    {quinielas.map((q) => (
                      <button
                        key={q.id}
                        className={`profile-hdr__quiniela-opt${quinielaId === q.id ? " profile-hdr__quiniela-opt--active" : ""}`}
                        onClick={() => handleSwitchQuiniela(q.id)}
                        disabled={quinielaSwitching}
                        aria-pressed={quinielaId === q.id}
                      >
                        {q.name}
                      </button>
                    ))}
                  </div>
                  {quinielaError && (
                    <div className='profile-hdr__passkey-error'>
                      {quinielaError}
                    </div>
                  )}
                </div>
              )}

              {passkeysSupported && (
                <div className='profile-hdr__passkeys'>
                  <span className='profile-hdr__color-label'>
                    {t("PROFILE_PASSKEYS_LABEL")}
                  </span>
                  {passkeys.length > 0 && (
                    <ul className='profile-hdr__passkey-list'>
                      {passkeys.map((pk) => (
                        <li key={pk.id} className='profile-hdr__passkey-item'>
                          <Icon icon='mdi:fingerprint' width={18} height={18} />
                          <span className='profile-hdr__passkey-name'>
                            {pk.friendly_name || t("PROFILE_PASSKEY_UNNAMED")}
                          </span>
                          <button
                            className='profile-hdr__passkey-remove'
                            onClick={() => handleDeletePasskey(pk.id)}
                            disabled={passkeyBusy}
                            aria-label={t("PROFILE_PASSKEY_REMOVE")}
                          >
                            <Icon
                              icon='mdi:trash-can-outline'
                              width={16}
                              height={16}
                            />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {passkeyError && (
                    <div className='profile-hdr__passkey-error'>
                      {passkeyError}
                    </div>
                  )}
                  <button
                    className='profile-hdr__passkey-add'
                    onClick={handleAddPasskey}
                    disabled={passkeyBusy}
                  >
                    <Icon
                      className='profile-hdr__passkey-add-icon'
                      icon='material-symbols:fingerprint'
                      width={20}
                      height={20}
                    />
                    {t("PROFILE_PASSKEY_ADD")}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </PageContainer>

      {showForm ? (
        <PredictionEntryForm
          initialPicks={userPicks}
          initialBracketPicks={bracketPicks}
          initialTopScorer={topScorer}
          isUpdatable={isUpdatable}
          knockoutMode={knockoutMode}
          onSave={handleSave}
          onSubmit={handleSubmit}
        />
      ) : (
        <ProfileReadOnly userPicks={userPicks} topScorer={topScorer} />
      )}
    </>
  );
}
