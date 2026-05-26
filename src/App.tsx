import { Outlet, useNavigate, useLocation } from "react-router";
import { useAuth } from "~/lib/auth-context";
import { DataProvider } from "~/lib/data-context";
import TopNav from "~/components/TopNav";
import JoinQuinielaScreen from "~/components/JoinQuinielaScreen";
import { useEffect } from "react";
import "./root.css";

function AppContent() {
  const { user, loading, submitted, isUpdatable, needsQuiniela } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [user, loading, navigate]);

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
  return (
    <div className="predictions-banner">
      <span className="predictions-banner__text">
        {type === "unsent"
          ? "You haven't submitted your predictions yet!"
          : "Predictions are still open — you can update yours!"}
      </span>
      <button
        className="predictions-banner__btn"
        onClick={() => navigate("/profile")}
      >
        {type === "unsent" ? "Enter Predictions →" : "Update Predictions →"}
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
