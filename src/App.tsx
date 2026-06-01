import { Outlet, useNavigate, useLocation } from "react-router";
import { useAuth } from "~/lib/auth-context";
import { useTranslation } from "~/hooks/useTranslation";
import { DataProvider } from "~/lib/data-context";
import TopNav from "~/components/TopNav";
import JoinQuinielaScreen from "~/components/JoinQuinielaScreen";
import { useEffect } from "react";
import "./root.css";

function AppContent() {
  const { user, loading, submitted, isUpdatable, needsQuiniela, quinielaVariant } = useAuth();
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
    !submitted && !onProfile ? "unsent"
    : submitted && isUpdatable && !onProfile ? "updatable"
    : null;

  return (
    <>
      <TopNav />
      {bannerType && <PredictionsBanner type={bannerType} />}
      <Outlet />
    </>
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
