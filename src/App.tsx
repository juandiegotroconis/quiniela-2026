import { Outlet, useNavigate, useLocation } from "react-router";
import { useAuth } from "~/lib/auth-context";
import { useTranslation } from "~/hooks/useTranslation";
import { DataProvider, useData } from "~/lib/data-context";
import TopNav from "~/components/TopNav";
import JoinQuinielaScreen from "~/components/JoinQuinielaScreen";
import { useNowTick } from "~/hooks/useNowTick";
import {
  getKnockoutEntryDeadline,
  getCurrentKnockoutStage,
  getStageLabelKey,
  formatMatchDateTime,
} from "~/lib/helpers";
import { useEffect } from "react";
import "./root.css";

function AppContent() {
  const { user, loading, submitted, isUpdatable, knockoutMode, needsQuiniela, quinielaVariant } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (quinielaVariant) {
      document.body.dataset.variant = quinielaVariant;
    } else {
      delete document.body.dataset.variant;
    }
  }, [quinielaVariant]);

  if (loading) return null;
  if (!user) return null;
  if (needsQuiniela) return <JoinQuinielaScreen />;

  const onProfile = pathname === "/profile";
  const bannerType: "unsent" | "updatable" | null =
    !isUpdatable || onProfile ? null
    : !submitted ? "unsent"
    : "updatable";

  return (
    <>
      <TopNav />
      {bannerType && <PredictionsBanner type={bannerType} />}
      {!onProfile && <KnockoutBanner knockoutMode={knockoutMode} />}
      <Outlet />
    </>
  );
}

// Announces that knockout predictions are open and, crucially, by when. The
// deadline depends on the quiniela's knockout_mode (see getKnockoutEntryDeadline):
// ONE_SHOT closes the whole bracket at the first Round-of-32 game; STAGE_BY_STAGE
// closes each stage at its own first game. Hidden once the deadline passes.
function KnockoutBanner({ knockoutMode }: { knockoutMode: string }) {
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const { matches } = useData();
  const now = useNowTick();

  const deadline = getKnockoutEntryDeadline(matches, knockoutMode);
  if (!deadline || now >= Date.parse(deadline)) return null;

  const when = formatMatchDateTime(deadline, language);
  // ONE_SHOT covers the whole bracket; STAGE_BY_STAGE names the current stage.
  const stage = knockoutMode === "ONE_SHOT" ? null : getCurrentKnockoutStage(matches);
  const stageKey = stage ? getStageLabelKey(stage) : null;
  const text =
    knockoutMode === "ONE_SHOT"
      ? t("BANNER_KNOCKOUT_ONESHOT_TEXT").replace("{deadline}", when)
      : t("BANNER_KNOCKOUT_STAGE_TEXT")
          .replace("{stage}", stageKey ? t(stageKey) : t("BANNER_KNOCKOUT_FALLBACK_STAGE"))
          .replace("{deadline}", when);

  return (
    <div className="predictions-banner predictions-banner--knockout">
      <span className="predictions-banner__text">{text}</span>
      <button
        className="predictions-banner__btn"
        onClick={() => navigate("/profile")}
      >
        {t("BANNER_KNOCKOUT_BTN")}
      </button>
    </div>
  );
}

function PredictionsBanner({ type }: { type: "unsent" | "updatable" }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <div className="predictions-banner">
      <span className="predictions-banner__text">
        {type === "unsent"
          ? t('BANNER_UNSENT_TEXT')
          : t('BANNER_UPDATABLE_TEXT')}
      </span>
      <button
        className="predictions-banner__btn"
        onClick={() => navigate("/profile")}
      >
        {type === "unsent" ? t('BANNER_ENTER_PREDICTIONS') : t('BANNER_UPDATE_PREDICTIONS')}
      </button>
    </div>
  );
}

export default function App() {
  return (
    <DataProvider>
      <AppContent />
    </DataProvider>
  );
}
