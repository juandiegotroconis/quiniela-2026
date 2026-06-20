import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider, redirect } from "react-router";
import App from "./App";
import LoginRoute from "./routes/login";
import RankingsRoute from "./routes/rankings";
import MatchesRoute from "./routes/matches";
import MatchRoute from "./routes/match";
import TeamRoute from "./routes/team";
import VenueRoute from "./routes/venue";
import GroupsRoute from "./routes/groups";
import ProfileRoute from "./routes/profile";
import PlayerRoute from "./routes/player";
import VerifyEmailRoute from "./routes/verify-email";
import ResetPasswordRoute from "./routes/reset-password";
import { AuthProvider } from "./lib/auth-context";
import { TranslationProvider } from "./lib/translation-context";
import { ThemeProvider } from "./lib/theme-context";
import "./styles/variables.css";
import "./styles/global.css";

const router = createBrowserRouter([
  { path: "/login", Component: LoginRoute },
  { path: "/verify-email", Component: VerifyEmailRoute },
  { path: "/reset-password", Component: ResetPasswordRoute },
  {
    path: "/",
    Component: App,
    children: [
      { index: true, loader: () => redirect("/rankings") },
      { path: "rankings", Component: RankingsRoute },
      { path: "matches", Component: MatchesRoute },
      { path: "matches/:id", Component: MatchRoute },
      { path: "teams/:code", Component: TeamRoute },
      { path: "venues/:venue", Component: VenueRoute },
      { path: "groups", Component: GroupsRoute },
      { path: "profile", Component: ProfileRoute },
      { path: "player/:id", Component: PlayerRoute },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <TranslationProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </TranslationProvider>
  </ThemeProvider>,
);
