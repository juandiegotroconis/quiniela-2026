import { Outlet, useNavigate, useLocation } from "react-router";
import { AuthProvider, useAuth } from "~/lib/auth-context";
import { DataProvider } from "~/lib/data-context";
import TopNav from "~/components/TopNav";
import JoinQuinielaScreen from "~/components/JoinQuinielaScreen";
import { useEffect } from "react";
import "./root.css";

function AppContent() {
  const { user, loading, submitted, needsQuiniela } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [user, loading, navigate]);

  if (loading) return null;
  if (!user) return null;
  if (needsQuiniela) return <JoinQuinielaScreen />;

  const showBanner = !submitted && pathname !== "/profile";

  return (
    <>
      <TopNav />
      {showBanner && <PredictionsBanner />}
      <Outlet />
    </>
  );
}

function PredictionsBanner() {
  const navigate = useNavigate();
  return (
    <div className="predictions-banner">
      <span className="predictions-banner__text">
        You haven't submitted your predictions yet!
      </span>
      <button
        className="predictions-banner__btn"
        onClick={() => navigate("/profile")}
      >
        Enter Predictions →
      </button>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </AuthProvider>
  );
}
