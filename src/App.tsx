import { Outlet, useNavigate } from "react-router";
import { AuthProvider, useAuth } from "~/lib/auth-context";
import TopNav from "~/components/TopNav";
import { useEffect } from "react";
import "./root.css";

function AppContent() {
  const { user, submitted } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);

  return (
    <>
      {user && <TopNav />}
      {user && !submitted && <PredictionsBanner />}
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
      <AppContent />
    </AuthProvider>
  );
}
