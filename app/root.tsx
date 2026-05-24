import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useNavigate,
} from 'react-router';
import type { Route } from './+types/root';
import { AuthProvider, useAuth } from '~/lib/auth-context';
import TopNav from '~/components/TopNav';
import { useEffect } from 'react';
import '~/styles/variables.css';
import '~/styles/global.css';
import './root.css';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'FWC26 Quiniela' },
    { name: 'description', content: 'FIFA World Cup 2026 Prediction Game' },
  ];
}

export function links() {
  return [
    {
      rel: 'preconnect',
      href: 'https://fonts.googleapis.com',
    },
    {
      rel: 'preconnect',
      href: 'https://fonts.gstatic.com',
      crossOrigin: 'anonymous',
    },
  ];
}

function AppContent() {
  const { user, submitted } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const showBanner = user && !submitted;

  return (
    <>
      {user && <TopNav />}
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
        onClick={() => navigate('/profile')}
      >
        Enter Predictions →
      </button>
    </div>
  );
}

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
