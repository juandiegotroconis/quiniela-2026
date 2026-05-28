import "./ProfileScreen.css";
import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "~/lib/auth-context";
import { useData } from "~/lib/data-context";
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
    submitted,
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
    navigate("/matches");
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const showForm = !submitted || isUpdatable;

  return (
    <>
      <PageContainer>
        <div className='profile-hdr'>
          <Avatar name={user?.name ?? "You"} color={activeColor} size={64} />
          <div className='profile-hdr__info'>
            <div className='profile-hdr__name'>
              {user?.name ?? "Your Profile"}
            </div>
            <div className='profile-hdr__rank-row'>
              {me && (
                <>
                  <span className='profile-hdr__rank-label'>
                    Rank{" "}
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
            Log Out
          </button>
        </div>

        <div className='profile-hdr__color-picker'>
          <span className='profile-hdr__color-label'>
            Avatar color{colorSaving ? " · Saving…" : ""}
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
