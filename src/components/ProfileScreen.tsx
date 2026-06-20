import "./ProfileScreen.css";
import { useState } from "react";
import { useNavigate } from "react-router";
import { Icon } from "@iconify/react";
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
import type { UserPickEntry } from "~/lib/auth-context";
import type { TopScorerSuggestion } from "~/lib/mock-data";

export default function ProfileScreen() {
  const {
    user,
    isUpdatable,
    userPicks,
    topScorer,
    savePredictions,
    submitPredictions,
    updateAvatarColor,
    logout,
  } = useAuth();
  const { getMember } = useData();
  const navigate = useNavigate();
  const me = user ? getMember(user.id) : undefined;

  const [activeColor, setActiveColor] = useState(
    me?.avatarColor ?? AVATAR_COLORS[0],
  );
  const [colorSaving, setColorSaving] = useState(false);

  const handleColorChange = async (color: string) => {
    setActiveColor(color);
    setColorSaving(true);
    await updateAvatarColor(color);
    setColorSaving(false);
  };

  const handleSave = async (
    picks: Record<number, UserPickEntry>,
    scorer: TopScorerSuggestion | null,
  ) => {
    await savePredictions(picks, scorer);
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
          <Avatar name={user?.name ?? t('PROFILE_YOU')} color={activeColor} size={64} />
          <div className='profile-hdr__info'>
            <div className='profile-hdr__name'>
              {user?.name ?? t('PROFILE_DEFAULT_NAME')}
            </div>
            <div className='profile-hdr__rank-row'>
              {me && (
                <>
                  <span className='profile-hdr__rank-label'>
                    {t('PROFILE_RANK_LABEL')}{" "}
                    <span className='profile-hdr__rank-num'>
                      #{me.rank ?? "—"}
                    </span>
                  </span>
                  <PositionChange
                    current={me.rank}
                    previous={me.prevRank ?? me.rank}
                  />
                  <span className='profile-hdr__pts'>{me.pts ?? 0} pts</span>
                </>
              )}
            </div>
          </div>
          <button className='profile-hdr__logout' onClick={handleLogout}>
            {t('PROFILE_LOG_OUT')}
          </button>
        </div>

        <div className='profile-hdr__color-picker'>
          <span className='profile-hdr__color-label'>
            {colorSaving ? t('PROFILE_AVATAR_COLOR_SAVING') : t('PROFILE_AVATAR_COLOR_LABEL')}
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
          <span className='profile-hdr__color-label'>{t('PROFILE_LANGUAGE_LABEL')}</span>
          <div className='profile-hdr__lang-options'>
            {([
              { code: 'en', flag: 'circle-flags:us', label: 'English' },
              { code: 'es', flag: 'circle-flags:es', label: 'Español' },
            ] as const).map(({ code, flag, label }) => (
              <button
                key={code}
                className={`profile-hdr__lang-opt${language === code ? ' profile-hdr__lang-opt--active' : ''}`}
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
          <span className='profile-hdr__color-label'>{t('PROFILE_THEME_LABEL')}</span>
          <div className='profile-hdr__theme-options'>
            {([
              { value: 'light', icon: 'mdi:white-balance-sunny', label: t('PROFILE_THEME_LIGHT') },
              { value: 'dark', icon: 'mdi:weather-night', label: t('PROFILE_THEME_DARK') },
            ] as const).map(({ value, icon, label }) => (
              <button
                key={value}
                className={`profile-hdr__theme-opt${theme === value ? ' profile-hdr__theme-opt--active' : ''}`}
                onClick={() => setTheme(value)}
                aria-pressed={theme === value}
              >
                <Icon icon={icon} width={20} height={20} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </PageContainer>

      {showForm ? (
        <PredictionEntryForm
          initialPicks={userPicks}
          initialTopScorer={topScorer}
          isUpdatable={isUpdatable}
          onSave={handleSave}
          onSubmit={handleSubmit}
        />
      ) : (
        <ProfileReadOnly userPicks={userPicks} topScorer={topScorer} />
      )}
    </>
  );
}
