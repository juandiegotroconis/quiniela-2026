import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { PassThrough } from "node:stream";
import { createReadableStreamFromReadable } from "@react-router/node";
import { ServerRouter, useNavigate, NavLink, UNSAFE_withComponentProps, Meta, Links, ScrollRestoration, Scripts, Outlet, redirect } from "react-router";
import { isbot } from "isbot";
import { renderToPipeableStream } from "react-dom/server";
import { createContext, useState, useEffect, useContext, useRef } from "react";
const ABORT_DELAY = 5e3;
function handleRequest(request, responseStatusCode, responseHeaders, routerContext, _loadContext) {
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    const userAgent = request.headers.get("user-agent");
    const readyOption = userAgent && isbot(userAgent) || routerContext.isSpaMode ? "onAllReady" : "onShellReady";
    const { pipe, abort } = renderToPipeableStream(
      /* @__PURE__ */ jsx(ServerRouter, { context: routerContext, url: request.url }),
      {
        [readyOption]() {
          shellRendered = true;
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);
          responseHeaders.set("Content-Type", "text/html");
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode
            })
          );
          pipe(body);
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          if (shellRendered) console.error(error);
        }
      }
    );
    setTimeout(abort, ABORT_DELAY);
  });
}
const entryServer = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: handleRequest
}, Symbol.toStringTag, { value: "Module" }));
const AuthContext = createContext(null);
function safeGet(key) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
}
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [userPicks, setUserPicks] = useState({});
  const [topScorer, setTopScorer] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setUser(safeGet("quiniela-user"));
    setSubmitted(!!localStorage.getItem("quiniela-submitted"));
    setUserPicks(safeGet("quiniela-picks") ?? {});
    setTopScorer(safeGet("quiniela-topscorer"));
    setHydrated(true);
  }, []);
  const login2 = (u) => {
    localStorage.setItem("quiniela-user", JSON.stringify(u));
    setUser(u);
  };
  const logout = () => {
    localStorage.removeItem("quiniela-user");
    setUser(null);
  };
  const submitPredictions = (picks, scorer) => {
    localStorage.setItem("quiniela-picks", JSON.stringify(picks));
    localStorage.setItem("quiniela-topscorer", JSON.stringify(scorer));
    localStorage.setItem("quiniela-submitted", "true");
    setUserPicks(picks);
    setTopScorer(scorer);
    setSubmitted(true);
  };
  if (!hydrated) return null;
  return /* @__PURE__ */ jsx(AuthContext.Provider, { value: { user, submitted, userPicks, topScorer, login: login2, logout, submitPredictions }, children });
}
function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
const GROUPS = {
  A: ["MEX", "RSA", "KOR", "CZE"],
  B: ["CAN", "BIH", "QAT", "SUI"],
  C: ["BRA", "MAR", "HAI", "SCO"],
  D: ["USA", "PAR", "AUS", "TUR"],
  E: ["GER", "CUW", "CIV", "ECU"],
  F: ["NED", "JPN", "SWE", "TUN"],
  G: ["BEL", "EGY", "IRN", "NZL"],
  H: ["ESP", "CPV", "KSA", "URY"],
  I: ["FRA", "SEN", "IRQ", "NOR"],
  J: ["ARG", "ALG", "AUT", "JOR"],
  K: ["POR", "COD", "UZB", "COL"],
  L: ["ENG", "CRO", "GHA", "PAN"]
};
const TEAM_FULL = {
  // Group A
  MEX: "Mexico",
  RSA: "South Africa",
  KOR: "South Korea",
  CZE: "Czechia",
  // Group B
  CAN: "Canada",
  BIH: "Bosnia-Herzegovina",
  QAT: "Qatar",
  SUI: "Switzerland",
  // Group C
  BRA: "Brazil",
  MAR: "Morocco",
  HAI: "Haiti",
  SCO: "Scotland",
  // Group D
  USA: "United States",
  PAR: "Paraguay",
  AUS: "Australia",
  TUR: "Turkey",
  // Group E
  GER: "Germany",
  CUW: "Curaçao",
  CIV: "Ivory Coast",
  ECU: "Ecuador",
  // Group F
  NED: "Netherlands",
  JPN: "Japan",
  SWE: "Sweden",
  TUN: "Tunisia",
  // Group G
  BEL: "Belgium",
  EGY: "Egypt",
  IRN: "Iran",
  NZL: "New Zealand",
  // Group H
  ESP: "Spain",
  CPV: "Cape Verde Islands",
  KSA: "Saudi Arabia",
  URY: "Uruguay",
  // Group I
  FRA: "France",
  SEN: "Senegal",
  IRQ: "Iraq",
  NOR: "Norway",
  // Group J
  ARG: "Argentina",
  ALG: "Algeria",
  AUT: "Austria",
  JOR: "Jordan",
  // Group K
  POR: "Portugal",
  COD: "Congo DR",
  UZB: "Uzbekistan",
  COL: "Colombia",
  // Group L
  ENG: "England",
  CRO: "Croatia",
  GHA: "Ghana",
  PAN: "Panama"
};
const TEAM_COLORS = {
  // Group A
  MEX: "#006847",
  RSA: "#007A4D",
  KOR: "#C60C30",
  CZE: "#D7141A",
  // Group B
  CAN: "#FF0000",
  BIH: "#002B7F",
  QAT: "#8D1B3D",
  SUI: "#E8112D",
  // Group C
  BRA: "#009C3B",
  MAR: "#C1272D",
  HAI: "#00209F",
  SCO: "#003399",
  // Group D
  USA: "#2A398D",
  PAR: "#D52B1E",
  AUS: "#00843D",
  TUR: "#E30A17",
  // Group E
  GER: "#1A1A22",
  CUW: "#003DA5",
  CIV: "#F77F00",
  ECU: "#FFD100",
  // Group F
  NED: "#FF6600",
  JPN: "#BC002D",
  SWE: "#006AA7",
  TUN: "#E70013",
  // Group G
  BEL: "#EF3340",
  EGY: "#CE1126",
  IRN: "#239F40",
  NZL: "#00247D",
  // Group H
  ESP: "#AA151B",
  CPV: "#003893",
  KSA: "#006C35",
  URY: "#5EB6E4",
  // Group I
  FRA: "#002395",
  SEN: "#00853F",
  IRQ: "#BB0000",
  NOR: "#EF2B2D",
  // Group J
  ARG: "#74ACDF",
  ALG: "#006233",
  AUT: "#ED2939",
  JOR: "#007A3D",
  // Group K
  POR: "#006600",
  COD: "#007FFF",
  UZB: "#1EB53A",
  COL: "#FCD116",
  // Group L
  ENG: "#CF081F",
  CRO: "#CC3333",
  GHA: "#006B3F",
  PAN: "#DB0020"
};
const AVATAR_COLORS = [
  "#E84C30",
  "#2979FF",
  "#7B2D8E",
  "#02B906",
  "#C8A94E",
  "#FF6D00",
  "#C2185B",
  "#00BFA5",
  "#1A237E",
  "#00B0FF",
  "#3CAC3B",
  "#FF1744",
  "#E61D25",
  "#FFDB00",
  "#004D40"
];
const ME_ID = 5;
const PLAYERS = [
  { id: 1, name: "Juan Rodríguez", pts: 87, rank: 1, prevRank: 3, history: [8, 6, 5, 3, 3, 1] },
  { id: 2, name: "Sarah Mitchell", pts: 82, rank: 2, prevRank: 1, history: [1, 1, 1, 1, 1, 2] },
  { id: 3, name: "Ahmed Khan", pts: 78, rank: 3, prevRank: 4, history: [5, 4, 4, 4, 4, 3] },
  { id: 4, name: "Yuki Tanaka", pts: 74, rank: 4, prevRank: 7, history: [12, 10, 9, 7, 7, 4] },
  { id: 5, name: "You", pts: 71, rank: 5, prevRank: 2, history: [3, 3, 2, 2, 2, 5] },
  { id: 6, name: "Liam O'Brien", pts: 68, rank: 6, prevRank: 6, history: [6, 7, 6, 6, 6, 6] },
  { id: 7, name: "Priya Sharma", pts: 64, rank: 7, prevRank: 8, history: [9, 8, 8, 8, 8, 7] },
  { id: 8, name: "Carlos Ruiz", pts: 60, rank: 8, prevRank: 5, history: [2, 2, 3, 5, 5, 8] },
  { id: 9, name: "Emma Chen", pts: 56, rank: 9, prevRank: 11, history: [14, 13, 12, 11, 11, 9] },
  { id: 10, name: "Diego Morales", pts: 52, rank: 10, prevRank: 9, history: [7, 5, 7, 9, 9, 10] },
  { id: 11, name: "Fatima Al-Hassan", pts: 48, rank: 11, prevRank: 15, history: [15, 15, 15, 15, 15, 11] },
  { id: 12, name: "Lucas Silva", pts: 44, rank: 12, prevRank: 10, history: [10, 9, 10, 10, 10, 12] },
  { id: 13, name: "Maria González", pts: 40, rank: 13, prevRank: 13, history: [11, 11, 11, 13, 13, 13] },
  { id: 14, name: "Tomás Andersson", pts: 36, rank: 14, prevRank: 12, history: [4, 12, 13, 12, 12, 14] },
  { id: 15, name: "Aisha Okafor", pts: 32, rank: 15, prevRank: 14, history: [13, 14, 14, 14, 14, 15] }
];
const MATCHES = [
  // ── Matchday 1 ──
  { id: 537327, group: "A", day: 1, teamA: "MEX", teamB: "RSA", scoreA: 2, scoreB: 1, status: "finished", time: "FT", date: "Jun 11" },
  { id: 537328, group: "A", day: 1, teamA: "KOR", teamB: "CZE", scoreA: 0, scoreB: 0, status: "finished", time: "FT", date: "Jun 11" },
  { id: 537333, group: "B", day: 1, teamA: "CAN", teamB: "BIH", scoreA: 2, scoreB: 0, status: "finished", time: "FT", date: "Jun 12" },
  { id: 537345, group: "D", day: 1, teamA: "USA", teamB: "PAR", scoreA: 1, scoreB: 0, status: "finished", time: "FT", date: "Jun 12" },
  { id: 537334, group: "B", day: 1, teamA: "QAT", teamB: "SUI", scoreA: 0, scoreB: 3, status: "finished", time: "FT", date: "Jun 13" },
  { id: 537339, group: "C", day: 1, teamA: "BRA", teamB: "MAR", scoreA: 2, scoreB: 1, status: "finished", time: "FT", date: "Jun 13" },
  { id: 537340, group: "C", day: 1, teamA: "HAI", teamB: "SCO", scoreA: 0, scoreB: 0, status: "live", time: "74'", date: "Jun 13" },
  { id: 537346, group: "D", day: 1, teamA: "AUS", teamB: "TUR", scoreA: null, scoreB: null, status: "upcoming", time: "00:00", date: "Jun 14" },
  { id: 537351, group: "E", day: 1, teamA: "GER", teamB: "CUW", scoreA: null, scoreB: null, status: "upcoming", time: "13:00", date: "Jun 14" },
  { id: 537357, group: "F", day: 1, teamA: "NED", teamB: "JPN", scoreA: null, scoreB: null, status: "upcoming", time: "16:00", date: "Jun 14" },
  { id: 537352, group: "E", day: 1, teamA: "CIV", teamB: "ECU", scoreA: null, scoreB: null, status: "upcoming", time: "19:00", date: "Jun 14" },
  { id: 537358, group: "F", day: 1, teamA: "SWE", teamB: "TUN", scoreA: null, scoreB: null, status: "upcoming", time: "22:00", date: "Jun 14" },
  { id: 537369, group: "H", day: 1, teamA: "ESP", teamB: "CPV", scoreA: null, scoreB: null, status: "upcoming", time: "12:00", date: "Jun 15" },
  { id: 537363, group: "G", day: 1, teamA: "BEL", teamB: "EGY", scoreA: null, scoreB: null, status: "upcoming", time: "15:00", date: "Jun 15" },
  { id: 537370, group: "H", day: 1, teamA: "KSA", teamB: "URY", scoreA: null, scoreB: null, status: "upcoming", time: "18:00", date: "Jun 15" },
  { id: 537364, group: "G", day: 1, teamA: "IRN", teamB: "NZL", scoreA: null, scoreB: null, status: "upcoming", time: "21:00", date: "Jun 15" },
  { id: 537391, group: "I", day: 1, teamA: "FRA", teamB: "SEN", scoreA: null, scoreB: null, status: "upcoming", time: "15:00", date: "Jun 16" },
  { id: 537392, group: "I", day: 1, teamA: "IRQ", teamB: "NOR", scoreA: null, scoreB: null, status: "upcoming", time: "18:00", date: "Jun 16" },
  { id: 537397, group: "J", day: 1, teamA: "ARG", teamB: "ALG", scoreA: null, scoreB: null, status: "upcoming", time: "21:00", date: "Jun 16" },
  { id: 537398, group: "J", day: 1, teamA: "AUT", teamB: "JOR", scoreA: null, scoreB: null, status: "upcoming", time: "00:00", date: "Jun 17" },
  { id: 537403, group: "K", day: 1, teamA: "POR", teamB: "COD", scoreA: null, scoreB: null, status: "upcoming", time: "13:00", date: "Jun 17" },
  { id: 537409, group: "L", day: 1, teamA: "ENG", teamB: "CRO", scoreA: null, scoreB: null, status: "upcoming", time: "16:00", date: "Jun 17" },
  { id: 537410, group: "L", day: 1, teamA: "GHA", teamB: "PAN", scoreA: null, scoreB: null, status: "upcoming", time: "19:00", date: "Jun 17" },
  { id: 537404, group: "K", day: 1, teamA: "UZB", teamB: "COL", scoreA: null, scoreB: null, status: "upcoming", time: "22:00", date: "Jun 17" },
  // ── Matchday 2 ──
  { id: 537329, group: "A", day: 2, teamA: "CZE", teamB: "RSA", scoreA: null, scoreB: null, status: "upcoming", time: "12:00", date: "Jun 18" },
  { id: 537335, group: "B", day: 2, teamA: "SUI", teamB: "BIH", scoreA: null, scoreB: null, status: "upcoming", time: "15:00", date: "Jun 18" },
  { id: 537336, group: "B", day: 2, teamA: "CAN", teamB: "QAT", scoreA: null, scoreB: null, status: "upcoming", time: "18:00", date: "Jun 18" },
  { id: 537330, group: "A", day: 2, teamA: "MEX", teamB: "KOR", scoreA: null, scoreB: null, status: "upcoming", time: "21:00", date: "Jun 18" },
  { id: 537348, group: "D", day: 2, teamA: "USA", teamB: "AUS", scoreA: null, scoreB: null, status: "upcoming", time: "15:00", date: "Jun 19" },
  { id: 537342, group: "C", day: 2, teamA: "SCO", teamB: "MAR", scoreA: null, scoreB: null, status: "upcoming", time: "18:00", date: "Jun 19" },
  { id: 537341, group: "C", day: 2, teamA: "BRA", teamB: "HAI", scoreA: null, scoreB: null, status: "upcoming", time: "20:30", date: "Jun 19" },
  { id: 537347, group: "D", day: 2, teamA: "TUR", teamB: "PAR", scoreA: null, scoreB: null, status: "upcoming", time: "23:00", date: "Jun 19" },
  { id: 537359, group: "F", day: 2, teamA: "NED", teamB: "SWE", scoreA: null, scoreB: null, status: "upcoming", time: "13:00", date: "Jun 20" },
  { id: 537353, group: "E", day: 2, teamA: "GER", teamB: "CIV", scoreA: null, scoreB: null, status: "upcoming", time: "16:00", date: "Jun 20" },
  { id: 537354, group: "E", day: 2, teamA: "ECU", teamB: "CUW", scoreA: null, scoreB: null, status: "upcoming", time: "20:00", date: "Jun 20" },
  { id: 537360, group: "F", day: 2, teamA: "TUN", teamB: "JPN", scoreA: null, scoreB: null, status: "upcoming", time: "00:00", date: "Jun 21" },
  { id: 537371, group: "H", day: 2, teamA: "ESP", teamB: "KSA", scoreA: null, scoreB: null, status: "upcoming", time: "12:00", date: "Jun 21" },
  { id: 537365, group: "G", day: 2, teamA: "BEL", teamB: "IRN", scoreA: null, scoreB: null, status: "upcoming", time: "15:00", date: "Jun 21" },
  { id: 537372, group: "H", day: 2, teamA: "URY", teamB: "CPV", scoreA: null, scoreB: null, status: "upcoming", time: "18:00", date: "Jun 21" },
  { id: 537366, group: "G", day: 2, teamA: "NZL", teamB: "EGY", scoreA: null, scoreB: null, status: "upcoming", time: "21:00", date: "Jun 21" },
  { id: 537399, group: "J", day: 2, teamA: "ARG", teamB: "AUT", scoreA: null, scoreB: null, status: "upcoming", time: "13:00", date: "Jun 22" },
  { id: 537393, group: "I", day: 2, teamA: "FRA", teamB: "IRQ", scoreA: null, scoreB: null, status: "upcoming", time: "17:00", date: "Jun 22" },
  { id: 537394, group: "I", day: 2, teamA: "NOR", teamB: "SEN", scoreA: null, scoreB: null, status: "upcoming", time: "20:00", date: "Jun 22" },
  { id: 537400, group: "J", day: 2, teamA: "JOR", teamB: "ALG", scoreA: null, scoreB: null, status: "upcoming", time: "23:00", date: "Jun 22" },
  { id: 537405, group: "K", day: 2, teamA: "POR", teamB: "UZB", scoreA: null, scoreB: null, status: "upcoming", time: "13:00", date: "Jun 23" },
  { id: 537411, group: "L", day: 2, teamA: "ENG", teamB: "GHA", scoreA: null, scoreB: null, status: "upcoming", time: "16:00", date: "Jun 23" },
  { id: 537412, group: "L", day: 2, teamA: "PAN", teamB: "CRO", scoreA: null, scoreB: null, status: "upcoming", time: "19:00", date: "Jun 23" },
  { id: 537406, group: "K", day: 2, teamA: "COL", teamB: "COD", scoreA: null, scoreB: null, status: "upcoming", time: "22:00", date: "Jun 23" },
  // ── Matchday 3 ──
  { id: 537337, group: "B", day: 3, teamA: "SUI", teamB: "CAN", scoreA: null, scoreB: null, status: "upcoming", time: "15:00", date: "Jun 24" },
  { id: 537338, group: "B", day: 3, teamA: "BIH", teamB: "QAT", scoreA: null, scoreB: null, status: "upcoming", time: "15:00", date: "Jun 24" },
  { id: 537344, group: "C", day: 3, teamA: "MAR", teamB: "HAI", scoreA: null, scoreB: null, status: "upcoming", time: "18:00", date: "Jun 24" },
  { id: 537343, group: "C", day: 3, teamA: "SCO", teamB: "BRA", scoreA: null, scoreB: null, status: "upcoming", time: "18:00", date: "Jun 24" },
  { id: 537331, group: "A", day: 3, teamA: "CZE", teamB: "MEX", scoreA: null, scoreB: null, status: "upcoming", time: "21:00", date: "Jun 24" },
  { id: 537332, group: "A", day: 3, teamA: "RSA", teamB: "KOR", scoreA: null, scoreB: null, status: "upcoming", time: "21:00", date: "Jun 24" },
  { id: 537355, group: "E", day: 3, teamA: "ECU", teamB: "GER", scoreA: null, scoreB: null, status: "upcoming", time: "16:00", date: "Jun 25" },
  { id: 537356, group: "E", day: 3, teamA: "CUW", teamB: "CIV", scoreA: null, scoreB: null, status: "upcoming", time: "16:00", date: "Jun 25" },
  { id: 537361, group: "F", day: 3, teamA: "TUN", teamB: "NED", scoreA: null, scoreB: null, status: "upcoming", time: "19:00", date: "Jun 25" },
  { id: 537362, group: "F", day: 3, teamA: "JPN", teamB: "SWE", scoreA: null, scoreB: null, status: "upcoming", time: "19:00", date: "Jun 25" },
  { id: 537349, group: "D", day: 3, teamA: "TUR", teamB: "USA", scoreA: null, scoreB: null, status: "upcoming", time: "22:00", date: "Jun 25" },
  { id: 537350, group: "D", day: 3, teamA: "PAR", teamB: "AUS", scoreA: null, scoreB: null, status: "upcoming", time: "22:00", date: "Jun 25" },
  { id: 537395, group: "I", day: 3, teamA: "NOR", teamB: "FRA", scoreA: null, scoreB: null, status: "upcoming", time: "15:00", date: "Jun 26" },
  { id: 537396, group: "I", day: 3, teamA: "SEN", teamB: "IRQ", scoreA: null, scoreB: null, status: "upcoming", time: "15:00", date: "Jun 26" },
  { id: 537373, group: "H", day: 3, teamA: "URY", teamB: "ESP", scoreA: null, scoreB: null, status: "upcoming", time: "20:00", date: "Jun 26" },
  { id: 537374, group: "H", day: 3, teamA: "CPV", teamB: "KSA", scoreA: null, scoreB: null, status: "upcoming", time: "20:00", date: "Jun 26" },
  { id: 537367, group: "G", day: 3, teamA: "NZL", teamB: "BEL", scoreA: null, scoreB: null, status: "upcoming", time: "23:00", date: "Jun 26" },
  { id: 537368, group: "G", day: 3, teamA: "EGY", teamB: "IRN", scoreA: null, scoreB: null, status: "upcoming", time: "23:00", date: "Jun 26" },
  { id: 537413, group: "L", day: 3, teamA: "PAN", teamB: "ENG", scoreA: null, scoreB: null, status: "upcoming", time: "17:00", date: "Jun 27" },
  { id: 537414, group: "L", day: 3, teamA: "CRO", teamB: "GHA", scoreA: null, scoreB: null, status: "upcoming", time: "17:00", date: "Jun 27" },
  { id: 537407, group: "K", day: 3, teamA: "COL", teamB: "POR", scoreA: null, scoreB: null, status: "upcoming", time: "19:30", date: "Jun 27" },
  { id: 537408, group: "K", day: 3, teamA: "COD", teamB: "UZB", scoreA: null, scoreB: null, status: "upcoming", time: "19:30", date: "Jun 27" },
  { id: 537401, group: "J", day: 3, teamA: "JOR", teamB: "ARG", scoreA: null, scoreB: null, status: "upcoming", time: "22:00", date: "Jun 27" },
  { id: 537402, group: "J", day: 3, teamA: "ALG", teamB: "AUT", scoreA: null, scoreB: null, status: "upcoming", time: "22:00", date: "Jun 27" }
];
const PREDICTIONS = {
  537327: [
    // MEX 2–1 RSA
    { playerId: 1, pickA: 2, pickB: 1 },
    { playerId: 7, pickA: 2, pickB: 1 },
    { playerId: 5, pickA: 1, pickB: 0 },
    { playerId: 3, pickA: 1, pickB: 0 },
    { playerId: 6, pickA: 1, pickB: 0 },
    { playerId: 2, pickA: 2, pickB: 0 },
    { playerId: 4, pickA: 2, pickB: 0 },
    { playerId: 9, pickA: 2, pickB: 0 },
    { playerId: 8, pickA: 0, pickB: 1 },
    { playerId: 10, pickA: 0, pickB: 1 },
    { playerId: 11, pickA: 1, pickB: 1 },
    { playerId: 12, pickA: 1, pickB: 1 },
    { playerId: 14, pickA: 1, pickB: 1 },
    { playerId: 15, pickA: 3, pickB: 1 },
    { playerId: 13, pickA: 3, pickB: 1 }
  ],
  537328: [
    // KOR 0–0 CZE
    { playerId: 1, pickA: 1, pickB: 1 },
    { playerId: 3, pickA: 1, pickB: 1 },
    { playerId: 2, pickA: 2, pickB: 0 },
    { playerId: 5, pickA: 2, pickB: 0 },
    { playerId: 8, pickA: 2, pickB: 0 },
    { playerId: 4, pickA: 0, pickB: 0 },
    { playerId: 6, pickA: 0, pickB: 0 },
    { playerId: 7, pickA: 0, pickB: 0 },
    { playerId: 9, pickA: 1, pickB: 2 },
    { playerId: 10, pickA: 1, pickB: 2 },
    { playerId: 12, pickA: 1, pickB: 2 },
    { playerId: 11, pickA: 0, pickB: 1 },
    { playerId: 14, pickA: 0, pickB: 1 },
    { playerId: 15, pickA: 0, pickB: 1 },
    { playerId: 13, pickA: 2, pickB: 1 }
  ],
  537333: [
    // CAN 2–0 BIH
    { playerId: 4, pickA: 2, pickB: 0 },
    { playerId: 1, pickA: 2, pickB: 0 },
    { playerId: 2, pickA: 1, pickB: 0 },
    { playerId: 3, pickA: 1, pickB: 0 },
    { playerId: 5, pickA: 2, pickB: 1 },
    { playerId: 6, pickA: 2, pickB: 1 },
    { playerId: 8, pickA: 0, pickB: 0 },
    { playerId: 7, pickA: 0, pickB: 0 },
    { playerId: 9, pickA: 1, pickB: 1 },
    { playerId: 10, pickA: 1, pickB: 1 },
    { playerId: 11, pickA: 1, pickB: 1 },
    { playerId: 13, pickA: 1, pickB: 1 },
    { playerId: 12, pickA: 0, pickB: 1 },
    { playerId: 14, pickA: 0, pickB: 1 },
    { playerId: 15, pickA: 0, pickB: 1 }
  ],
  537345: [
    // USA 1–0 PAR
    { playerId: 1, pickA: 2, pickB: 2 },
    { playerId: 3, pickA: 1, pickB: 0 },
    { playerId: 2, pickA: 1, pickB: 0 },
    { playerId: 5, pickA: 1, pickB: 0 },
    { playerId: 4, pickA: 0, pickB: 0 },
    { playerId: 9, pickA: 0, pickB: 0 },
    { playerId: 6, pickA: 2, pickB: 1 },
    { playerId: 8, pickA: 2, pickB: 1 },
    { playerId: 10, pickA: 2, pickB: 1 },
    { playerId: 7, pickA: 3, pickB: 1 },
    { playerId: 12, pickA: 3, pickB: 1 },
    { playerId: 11, pickA: 1, pickB: 0 },
    { playerId: 13, pickA: 1, pickB: 0 },
    { playerId: 14, pickA: 1, pickB: 0 },
    { playerId: 15, pickA: 1, pickB: 0 }
  ],
  537334: [
    // QAT 0–3 SUI
    { playerId: 11, pickA: 0, pickB: 3 },
    { playerId: 3, pickA: 0, pickB: 3 },
    { playerId: 1, pickA: 0, pickB: 2 },
    { playerId: 5, pickA: 0, pickB: 2 },
    { playerId: 6, pickA: 0, pickB: 2 },
    { playerId: 2, pickA: 0, pickB: 1 },
    { playerId: 4, pickA: 0, pickB: 1 },
    { playerId: 8, pickA: 0, pickB: 0 },
    { playerId: 7, pickA: 0, pickB: 0 },
    { playerId: 9, pickA: 1, pickB: 1 },
    { playerId: 10, pickA: 1, pickB: 1 },
    { playerId: 12, pickA: 1, pickB: 0 },
    { playerId: 13, pickA: 1, pickB: 0 },
    { playerId: 14, pickA: 1, pickB: 0 },
    { playerId: 15, pickA: 1, pickB: 0 }
  ],
  537339: [
    // BRA 2–1 MAR
    { playerId: 1, pickA: 2, pickB: 0 },
    { playerId: 2, pickA: 2, pickB: 0 },
    { playerId: 3, pickA: 2, pickB: 1 },
    { playerId: 5, pickA: 2, pickB: 1 },
    { playerId: 8, pickA: 2, pickB: 1 },
    { playerId: 4, pickA: 3, pickB: 0 },
    { playerId: 6, pickA: 3, pickB: 0 },
    { playerId: 7, pickA: 1, pickB: 1 },
    { playerId: 9, pickA: 1, pickB: 1 },
    { playerId: 10, pickA: 0, pickB: 1 },
    { playerId: 11, pickA: 0, pickB: 1 },
    { playerId: 12, pickA: 1, pickB: 2 },
    { playerId: 13, pickA: 1, pickB: 2 },
    { playerId: 14, pickA: 0, pickB: 0 },
    { playerId: 15, pickA: 0, pickB: 0 }
  ],
  537340: [
    // HAI 0–0 SCO (live 74')
    { playerId: 1, pickA: 0, pickB: 2 },
    { playerId: 2, pickA: 0, pickB: 2 },
    { playerId: 3, pickA: 0, pickB: 2 },
    { playerId: 4, pickA: 0, pickB: 1 },
    { playerId: 5, pickA: 0, pickB: 1 },
    { playerId: 6, pickA: 0, pickB: 0 },
    { playerId: 8, pickA: 0, pickB: 0 },
    { playerId: 7, pickA: 1, pickB: 1 },
    { playerId: 9, pickA: 1, pickB: 1 },
    { playerId: 10, pickA: 1, pickB: 0 },
    { playerId: 11, pickA: 1, pickB: 0 },
    { playerId: 12, pickA: 2, pickB: 1 },
    { playerId: 14, pickA: 2, pickB: 1 },
    { playerId: 13, pickA: 1, pickB: 2 },
    { playerId: 15, pickA: 1, pickB: 2 }
  ]
};
const TOP_SCORER_SUGGESTIONS = [
  { name: "Kylian Mbappé", team: "FRA" },
  { name: "Lionel Messi", team: "ARG" },
  { name: "Erling Haaland", team: "NOR" },
  { name: "Vinícius Jr", team: "BRA" },
  { name: "Harry Kane", team: "ENG" },
  { name: "Lautaro Martínez", team: "ARG" },
  { name: "Cristiano Ronaldo", team: "POR" },
  { name: "Jamal Musiala", team: "GER" },
  { name: "Bukayo Saka", team: "ENG" },
  { name: "Cody Gakpo", team: "NED" },
  { name: "Son Heung-min", team: "KOR" },
  { name: "Santiago Giménez", team: "MEX" },
  { name: "Sadio Mané", team: "SEN" },
  { name: "Achraf Hakimi", team: "MAR" },
  { name: "Lamine Yamal", team: "ESP" },
  { name: "Pedri", team: "ESP" },
  { name: "Federico Valverde", team: "URY" },
  { name: "Christian Pulisic", team: "USA" }
];
function Avatar({ name, index = 0, size = 36 }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const bg = AVATAR_COLORS[index % AVATAR_COLORS.length];
  return /* @__PURE__ */ jsx(
    "div",
    {
      className: "avatar",
      style: {
        width: size,
        height: size,
        background: bg,
        fontSize: size * 0.38
      },
      children: initials
    }
  );
}
function TopNav() {
  useNavigate();
  const { user } = useAuth();
  const displayName = (user == null ? void 0 : user.name) ?? "You";
  return /* @__PURE__ */ jsxs("header", { className: "top-nav", children: [
    /* @__PURE__ */ jsxs(NavLink, { to: "/rankings", className: "top-nav__logo", children: [
      /* @__PURE__ */ jsx("span", { className: "top-nav__logo-icon", children: "⚽" }),
      /* @__PURE__ */ jsx("span", { children: "FWC26" }),
      /* @__PURE__ */ jsx("span", { className: "top-nav__logo-sub", children: "Quiniela" })
    ] }),
    /* @__PURE__ */ jsx("nav", { className: "top-nav__nav", children: [
      { to: "/rankings", label: "Rankings" },
      { to: "/matches", label: "Matches" },
      { to: "/groups", label: "Groups" }
    ].map((t) => /* @__PURE__ */ jsx(
      NavLink,
      {
        to: t.to,
        className: ({ isActive }) => `top-nav__btn${isActive ? " top-nav__btn--active" : ""}`,
        children: t.label
      },
      t.to
    )) }),
    /* @__PURE__ */ jsxs(
      NavLink,
      {
        to: "/profile",
        className: ({ isActive }) => `top-nav__profile${isActive ? " top-nav__profile--active" : ""}`,
        children: [
          /* @__PURE__ */ jsx(Avatar, { name: displayName, index: ME_ID - 1, size: 32 }),
          /* @__PURE__ */ jsx("span", { className: "top-nav__profile-name", children: displayName })
        ]
      }
    )
  ] });
}
function meta$4({}) {
  return [{
    title: "FWC26 Quiniela"
  }, {
    name: "description",
    content: "FIFA World Cup 2026 Prediction Game"
  }];
}
function links() {
  return [{
    rel: "preconnect",
    href: "https://fonts.googleapis.com"
  }, {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous"
  }];
}
function AppContent() {
  const {
    user,
    submitted
  } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);
  const showBanner = user && !submitted;
  return /* @__PURE__ */ jsxs(Fragment, {
    children: [user && /* @__PURE__ */ jsx(TopNav, {}), showBanner && /* @__PURE__ */ jsx(PredictionsBanner, {}), /* @__PURE__ */ jsx(Outlet, {})]
  });
}
function PredictionsBanner() {
  const navigate = useNavigate();
  return /* @__PURE__ */ jsxs("div", {
    className: "predictions-banner",
    children: [/* @__PURE__ */ jsx("span", {
      className: "predictions-banner__text",
      children: "You haven't submitted your predictions yet!"
    }), /* @__PURE__ */ jsx("button", {
      className: "predictions-banner__btn",
      onClick: () => navigate("/profile"),
      children: "Enter Predictions →"
    })]
  });
}
const root = UNSAFE_withComponentProps(function App() {
  return /* @__PURE__ */ jsxs("html", {
    lang: "en",
    children: [/* @__PURE__ */ jsxs("head", {
      children: [/* @__PURE__ */ jsx("meta", {
        charSet: "utf-8"
      }), /* @__PURE__ */ jsx("meta", {
        name: "viewport",
        content: "width=device-width, initial-scale=1"
      }), /* @__PURE__ */ jsx(Meta, {}), /* @__PURE__ */ jsx(Links, {})]
    }), /* @__PURE__ */ jsxs("body", {
      children: [/* @__PURE__ */ jsx(AuthProvider, {
        children: /* @__PURE__ */ jsx(AppContent, {})
      }), /* @__PURE__ */ jsx(ScrollRestoration, {}), /* @__PURE__ */ jsx(Scripts, {})]
    })]
  });
});
const route0 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: root,
  links,
  meta: meta$4
}, Symbol.toStringTag, { value: "Module" }));
function loader() {
  return redirect("/rankings");
}
const route1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  loader
}, Symbol.toStringTag, { value: "Module" }));
function AuthScreen() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const { login: login2 } = useAuth();
  const navigate = useNavigate();
  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }
    if (mode === "signup" && !name) {
      setError("Please enter your name");
      return;
    }
    login2({ email, name: name || email.split("@")[0] });
    navigate("/rankings");
  };
  return /* @__PURE__ */ jsx("div", { className: "auth-screen", children: /* @__PURE__ */ jsxs("div", { className: "auth-screen__inner", children: [
    /* @__PURE__ */ jsxs("div", { className: "auth-screen__logo", children: [
      /* @__PURE__ */ jsxs("div", { className: "auth-screen__logo-title", children: [
        /* @__PURE__ */ jsx("span", { className: "auth-screen__logo-icon", children: "⚽" }),
        " ",
        /* @__PURE__ */ jsx("span", { children: "FWC26" }),
        " ",
        /* @__PURE__ */ jsx("span", { className: "auth-screen__logo-sub", children: "Quiniela" })
      ] }),
      /* @__PURE__ */ jsx("p", { className: "auth-screen__tagline", children: "Predict. Compete. Win." })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "auth-screen__toggle", children: ["login", "signup"].map((m) => /* @__PURE__ */ jsx(
      "button",
      {
        className: `auth-screen__toggle-btn${mode === m ? " auth-screen__toggle-btn--active" : ""}`,
        onClick: () => {
          setMode(m);
          setError("");
        },
        children: m === "login" ? "Log In" : "Sign Up"
      },
      m
    )) }),
    /* @__PURE__ */ jsxs("form", { className: "auth-screen__form", onSubmit: handleSubmit, children: [
      mode === "signup" && /* @__PURE__ */ jsxs("div", { className: "auth-screen__field", children: [
        /* @__PURE__ */ jsx("label", { className: "auth-screen__label", children: "Full Name" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "text",
            className: "auth-screen__input",
            value: name,
            onChange: (e) => setName(e.target.value),
            placeholder: "Juan Rodríguez"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "auth-screen__field", children: [
        /* @__PURE__ */ jsx("label", { className: "auth-screen__label", children: "Email" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "email",
            className: "auth-screen__input",
            value: email,
            onChange: (e) => setEmail(e.target.value),
            placeholder: "you@example.com"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "auth-screen__field", children: [
        /* @__PURE__ */ jsx("label", { className: "auth-screen__label", children: "Password" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "password",
            className: "auth-screen__input",
            value: password,
            onChange: (e) => setPassword(e.target.value),
            placeholder: "••••••••"
          }
        )
      ] }),
      error && /* @__PURE__ */ jsx("div", { className: "auth-screen__error", children: error }),
      /* @__PURE__ */ jsx("button", { type: "submit", className: "auth-screen__submit", children: mode === "login" ? "Log In" : "Create Account" })
    ] }),
    mode === "login" && /* @__PURE__ */ jsx("div", { className: "auth-screen__footer", children: /* @__PURE__ */ jsx("a", { href: "#", className: "auth-screen__footer-link", onClick: (e) => e.preventDefault(), children: "Forgot password?" }) })
  ] }) });
}
const login = UNSAFE_withComponentProps(function LoginRoute() {
  return /* @__PURE__ */ jsx(AuthScreen, {});
});
const route2 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: login
}, Symbol.toStringTag, { value: "Module" }));
function PageContainer({ children, wide }) {
  return /* @__PURE__ */ jsx("div", { className: `page-container${wide ? " page-container--wide" : ""}`, children });
}
function SectionHeader({ title, subtitle, right }) {
  return /* @__PURE__ */ jsxs("div", { className: "section-header", children: [
    /* @__PURE__ */ jsxs("div", { className: "section-header__left", children: [
      /* @__PURE__ */ jsx("h2", { className: "section-header__title", children: title }),
      subtitle && /* @__PURE__ */ jsx("p", { className: "section-header__subtitle", children: subtitle })
    ] }),
    right
  ] });
}
function PositionChange({ current, previous }) {
  const diff = previous - current;
  if (diff === 0) {
    return /* @__PURE__ */ jsx("span", { className: "position-change position-change--neutral", children: "—" });
  }
  const up = diff > 0;
  return /* @__PURE__ */ jsxs("span", { className: `position-change ${up ? "position-change--up" : "position-change--down"}`, children: [
    /* @__PURE__ */ jsx("span", { className: "position-change__arrow", children: up ? "▲" : "▼" }),
    Math.abs(diff)
  ] });
}
function PodiumCard({ player, rankColor, isFirst }) {
  const sz = isFirst ? 64 : 48;
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: `podium-card${isFirst ? "" : player.rank === 2 ? " podium-card--second" : " podium-card--third"}`,
      style: { width: isFirst ? 140 : 110 },
      children: [
        /* @__PURE__ */ jsxs("div", { className: "podium-card__avatar-wrap", children: [
          /* @__PURE__ */ jsx(Avatar, { name: player.name, index: player.id - 1, size: sz }),
          /* @__PURE__ */ jsx(
            "div",
            {
              className: "podium-card__rank-badge",
              style: { background: rankColor },
              children: player.rank
            }
          )
        ] }),
        /* @__PURE__ */ jsx("span", { className: "podium-card__name", children: player.id === ME_ID ? "You" : player.name.split(" ")[0] }),
        /* @__PURE__ */ jsxs("div", { className: "podium-card__pts", children: [
          /* @__PURE__ */ jsx(
            "span",
            {
              className: "podium-card__pts-num",
              style: { fontSize: isFirst ? 26 : 20, color: rankColor },
              children: player.pts
            }
          ),
          /* @__PURE__ */ jsx("span", { className: "podium-card__pts-label", children: "pts" })
        ] }),
        /* @__PURE__ */ jsx(PositionChange, { current: player.rank, previous: player.prevRank })
      ]
    }
  );
}
function Sparkline({ history, width = 64, height = 22 }) {
  if (!history || history.length < 2) return null;
  const max = 15;
  const pts = history.map((r, i) => {
    const x = i / (history.length - 1) * width;
    const y = (r - 1) / (max - 1) * (height - 4) + 2;
    return [x, y];
  });
  const cur = history[history.length - 1];
  const prev = history[history.length - 2];
  const c = cur < prev ? "#02B906" : cur > prev ? "#E61D25" : "rgba(255,255,255,0.3)";
  const last = pts[pts.length - 1];
  return /* @__PURE__ */ jsxs("svg", { className: "sparkline", width, height, children: [
    /* @__PURE__ */ jsx(
      "polyline",
      {
        points: pts.map((p) => p.join(",")).join(" "),
        fill: "none",
        stroke: c,
        strokeWidth: "1.5",
        strokeLinecap: "round",
        strokeLinejoin: "round"
      }
    ),
    /* @__PURE__ */ jsx("circle", { cx: last[0], cy: last[1], r: "2.5", fill: c })
  ] });
}
const RANK_COLORS = ["#C8A94E", "#B0B0B0", "#CD7F32"];
function LeaderboardScreen() {
  const sorted = [...PLAYERS].sort((a, b) => a.rank - b.rank);
  return /* @__PURE__ */ jsxs(PageContainer, { children: [
    /* @__PURE__ */ jsx(SectionHeader, { title: "Rankings", subtitle: "Friends League · 15 players" }),
    /* @__PURE__ */ jsxs("div", { className: "leaderboard__podium", children: [
      /* @__PURE__ */ jsx(PodiumCard, { player: sorted[1], rankColor: RANK_COLORS[1] }),
      /* @__PURE__ */ jsx(PodiumCard, { player: sorted[0], rankColor: RANK_COLORS[0], isFirst: true }),
      /* @__PURE__ */ jsx(PodiumCard, { player: sorted[2], rankColor: RANK_COLORS[2] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "leaderboard__table", children: [
      /* @__PURE__ */ jsxs("div", { className: "leaderboard__table-header", children: [
        /* @__PURE__ */ jsx("span", { children: "#" }),
        /* @__PURE__ */ jsx("span", {}),
        /* @__PURE__ */ jsx("span", { children: "Player" }),
        /* @__PURE__ */ jsx("span", { className: "leaderboard__table-header-trend", children: "Trend" }),
        /* @__PURE__ */ jsx("span", { className: "leaderboard__table-header-pts", children: "Pts" })
      ] }),
      sorted.slice(3).map((p) => {
        const isMe = p.id === ME_ID;
        return /* @__PURE__ */ jsxs(
          "div",
          {
            className: `leaderboard__row${isMe ? " leaderboard__row--me" : ""}`,
            children: [
              /* @__PURE__ */ jsx("span", { className: "leaderboard__row-rank", children: p.rank }),
              /* @__PURE__ */ jsx(PositionChange, { current: p.rank, previous: p.prevRank }),
              /* @__PURE__ */ jsxs("div", { className: "leaderboard__row-player", children: [
                /* @__PURE__ */ jsx(Avatar, { name: p.name, index: p.id - 1, size: 32 }),
                /* @__PURE__ */ jsx("span", { className: `leaderboard__row-name${isMe ? " leaderboard__row-name--me" : ""}`, children: isMe ? "You" : p.name })
              ] }),
              /* @__PURE__ */ jsx("div", { className: "leaderboard__row-trend", children: /* @__PURE__ */ jsx(Sparkline, { history: p.history }) }),
              /* @__PURE__ */ jsx("span", { className: "leaderboard__row-pts", children: p.pts })
            ]
          },
          p.id
        );
      })
    ] })
  ] });
}
function meta$3() {
  return [{
    title: "Rankings — FWC26 Quiniela"
  }];
}
const rankings = UNSAFE_withComponentProps(function RankingsRoute() {
  return /* @__PURE__ */ jsx(LeaderboardScreen, {});
});
const route3 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: rankings,
  meta: meta$3
}, Symbol.toStringTag, { value: "Module" }));
function FilterTabs({ tabs, active, onChange }) {
  return /* @__PURE__ */ jsx("div", { className: "filter-tabs", children: tabs.map((t) => /* @__PURE__ */ jsx(
    "button",
    {
      className: `filter-tabs__btn${active === t.id ? " filter-tabs__btn--active" : ""}`,
      onClick: () => onChange(t.id),
      children: t.label
    },
    t.id
  )) });
}
function getPlayer(id) {
  return PLAYERS.find((p) => p.id === id);
}
function getPickResult(match, pickA, pickB) {
  if (match.status !== "finished") return null;
  if (pickA === match.scoreA && pickB === match.scoreB) return "exact";
  const pickSign = Math.sign(pickA - pickB);
  const realSign = Math.sign((match.scoreA ?? 0) - (match.scoreB ?? 0));
  if (pickSign === realSign) return "winner";
  return "miss";
}
function getResultPoints(r) {
  if (r === "exact") return 10;
  if (r === "winner") return 5;
  return 0;
}
function getResultLabel(r) {
  if (r === "exact") return "Exact";
  if (r === "winner") return "Winner";
  return "Miss";
}
function getResultVariant(r) {
  if (r === "exact") return "success";
  if (r === "winner") return "warning";
  return "default";
}
function groupPredictions(matchId) {
  const preds = PREDICTIONS[matchId] ?? [];
  const match = MATCHES.find((m) => m.id === matchId);
  const groups2 = {};
  preds.forEach((p) => {
    const key = `${p.pickA}-${p.pickB}`;
    if (!groups2[key]) {
      const result = match ? getPickResult(match, p.pickA, p.pickB) : null;
      groups2[key] = {
        pickA: p.pickA,
        pickB: p.pickB,
        key,
        result,
        points: getResultPoints(result),
        label: result ? getResultLabel(result) : null,
        variant: result ? getResultVariant(result) : null,
        players: [],
        hasMe: false
      };
    }
    groups2[key].players.push(getPlayer(p.playerId));
    if (p.playerId === ME_ID) groups2[key].hasMe = true;
  });
  const order = { exact: 0, winner: 1, miss: 2 };
  return Object.values(groups2).sort((a, b) => {
    const oa = a.result ? order[a.result] : 3;
    const ob = b.result ? order[b.result] : 3;
    return oa !== ob ? oa - ob : b.players.length - a.players.length;
  });
}
function calcGroupStandings(groupId, userPicks) {
  const teams = GROUPS[groupId] ?? [];
  const gm = MATCHES.filter((m) => m.group === groupId);
  const s = {};
  teams.forEach((t) => {
    s[t] = { team: t, mp: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0, projected: false };
  });
  gm.forEach((match) => {
    let sA, sB, proj = false;
    if (match.status === "finished" || match.status === "live") {
      sA = match.scoreA ?? 0;
      sB = match.scoreB ?? 0;
    } else if (userPicks && userPicks[match.id] && userPicks[match.id].pickA !== "" && userPicks[match.id].pickB !== "") {
      sA = parseInt(String(userPicks[match.id].pickA));
      sB = parseInt(String(userPicks[match.id].pickB));
      if (isNaN(sA) || isNaN(sB)) return;
      proj = true;
    } else {
      return;
    }
    s[match.teamA].mp++;
    s[match.teamB].mp++;
    s[match.teamA].gf += sA;
    s[match.teamA].ga += sB;
    s[match.teamB].gf += sB;
    s[match.teamB].ga += sA;
    if (proj) {
      s[match.teamA].projected = true;
      s[match.teamB].projected = true;
    }
    if (sA > sB) {
      s[match.teamA].w++;
      s[match.teamA].pts += 3;
      s[match.teamB].l++;
    } else if (sA < sB) {
      s[match.teamB].w++;
      s[match.teamB].pts += 3;
      s[match.teamA].l++;
    } else {
      s[match.teamA].d++;
      s[match.teamA].pts += 1;
      s[match.teamB].d++;
      s[match.teamB].pts += 1;
    }
    s[match.teamA].gd = s[match.teamA].gf - s[match.teamA].ga;
    s[match.teamB].gd = s[match.teamB].gf - s[match.teamB].ga;
  });
  return Object.values(s).sort(
    (a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf
  );
}
function getTeamColor(code) {
  return TEAM_COLORS[code] ?? "#24242E";
}
function TeamFlag({ code, size = 32 }) {
  const bg = getTeamColor(code);
  const h = Math.round(size * 0.72);
  return /* @__PURE__ */ jsx(
    "div",
    {
      className: `team-flag${size < 30 ? " team-flag--sm" : ""}`,
      style: { width: size, height: h, background: bg },
      children: code
    }
  );
}
function Badge({ children, variant = "default" }) {
  return /* @__PURE__ */ jsx("span", { className: `badge badge--${variant}`, children });
}
function MatchStatusBadge$1({ match }) {
  if (match.status === "live") {
    return /* @__PURE__ */ jsxs(Badge, { variant: "error", children: [
      /* @__PURE__ */ jsx("span", { className: "badge__live-dot", children: "●" }),
      " LIVE ",
      match.time
    ] });
  }
  if (match.status === "finished") {
    return /* @__PURE__ */ jsx(Badge, { variant: "default", children: "FT" });
  }
  return /* @__PURE__ */ jsxs("span", { className: "match-card__time", children: [
    match.date,
    " · ",
    match.time
  ] });
}
function MatchCard({ match, onTap, userPick }) {
  const isLive = match.status === "live";
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: `match-card${isLive ? " match-card--live" : ""}`,
      onClick: onTap,
      role: "button",
      tabIndex: 0,
      onKeyDown: (e) => e.key === "Enter" && onTap(),
      children: [
        /* @__PURE__ */ jsxs("div", { className: "match-card__header", children: [
          /* @__PURE__ */ jsxs("span", { className: "match-card__meta", children: [
            "Group ",
            match.group,
            " · ",
            match.date
          ] }),
          /* @__PURE__ */ jsx(MatchStatusBadge$1, { match })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "match-card__score-row", children: [
          /* @__PURE__ */ jsxs("div", { className: "match-card__team", children: [
            /* @__PURE__ */ jsx(TeamFlag, { code: match.teamA, size: 30 }),
            /* @__PURE__ */ jsx("span", { className: "match-card__team-name", children: match.teamA })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "match-card__score", children: [
            /* @__PURE__ */ jsx("span", { children: match.scoreA !== null ? match.scoreA : "–" }),
            /* @__PURE__ */ jsx("span", { className: "match-card__score-sep", children: ":" }),
            /* @__PURE__ */ jsx("span", { children: match.scoreB !== null ? match.scoreB : "–" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "match-card__team", children: [
            /* @__PURE__ */ jsx(TeamFlag, { code: match.teamB, size: 30 }),
            /* @__PURE__ */ jsx("span", { className: "match-card__team-name", children: match.teamB })
          ] })
        ] }),
        userPick && userPick.pickA !== "" && userPick.pickB !== "" && /* @__PURE__ */ jsxs("div", { className: "match-card__pick", children: [
          /* @__PURE__ */ jsx("span", { className: "match-card__pick-label", children: "Your pick:" }),
          userPick.pickA,
          " - ",
          userPick.pickB
        ] })
      ]
    }
  );
}
function PredictionGroupCard({ group, match }) {
  const resultColors = {
    exact: "rgba(2,185,6,0.25)",
    winner: "rgba(200,169,78,0.25)",
    miss: "rgba(255,255,255,0.06)"
  };
  const borderColor = group.hasMe ? "rgba(2,185,6,0.25)" : group.result ? resultColors[group.result] : "var(--border-subtle)";
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: `pred-group-card${group.hasMe ? " pred-group-card--me" : ""}`,
      style: { borderColor },
      children: [
        group.hasMe && /* @__PURE__ */ jsx("div", { className: "pred-group-card__your-pick", children: "Your pick" }),
        /* @__PURE__ */ jsxs("div", { className: "pred-group-card__score", children: [
          /* @__PURE__ */ jsx("span", { children: group.pickA }),
          /* @__PURE__ */ jsx("span", { className: "pred-group-card__score-sep", children: "-" }),
          /* @__PURE__ */ jsx("span", { children: group.pickB })
        ] }),
        match.status === "finished" && group.result && /* @__PURE__ */ jsx("div", { className: "pred-group-card__badge", children: /* @__PURE__ */ jsxs(Badge, { variant: group.variant ?? "default", children: [
          "+",
          group.points,
          " ",
          group.label
        ] }) }),
        /* @__PURE__ */ jsx("div", { className: "pred-group-card__players", children: group.players.map((p) => {
          if (!p) return null;
          const isMe = p.id === ME_ID;
          return /* @__PURE__ */ jsxs("div", { className: "pred-group-card__player", title: p.name, children: [
            /* @__PURE__ */ jsx(Avatar, { name: p.name, index: p.id - 1, size: 28 }),
            /* @__PURE__ */ jsx("span", { className: `pred-group-card__player-name${isMe ? " pred-group-card__player-name--me" : ""}`, children: isMe ? "You" : p.name.split(" ")[0] })
          ] }, p.id);
        }) })
      ]
    }
  );
}
function MatchStatusBadge({ match }) {
  if (match.status === "live") {
    return /* @__PURE__ */ jsxs(Badge, { variant: "error", children: [
      /* @__PURE__ */ jsx("span", { className: "badge__live-dot", children: "●" }),
      " LIVE ",
      match.time
    ] });
  }
  if (match.status === "finished") return /* @__PURE__ */ jsx(Badge, { variant: "default", children: "FT" });
  return /* @__PURE__ */ jsxs("span", { className: "match-detail__status-time", children: [
    match.date,
    " · ",
    match.time
  ] });
}
function MatchDetail({ match, onBack, userPick }) {
  const groups2 = groupPredictions(match.id);
  const hasPredictions = groups2.length > 0;
  const isFinished = match.status === "finished";
  const hasPick = userPick && userPick.pickA !== "" && userPick.pickB !== "";
  let result = null;
  if (isFinished && hasPick) {
    result = getPickResult(match, parseInt(String(userPick.pickA)), parseInt(String(userPick.pickB)));
  }
  const resultColors = {
    exact: "var(--color-green)",
    winner: "var(--color-gold)",
    miss: "var(--color-error)"
  };
  const totalPreds = (PREDICTIONS[match.id] ?? []).length;
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsx("button", { className: "match-detail__back", onClick: onBack, children: "← Back to matches" }),
    /* @__PURE__ */ jsxs("div", { className: "match-detail__score-card", children: [
      /* @__PURE__ */ jsxs("div", { className: "match-detail__score-row", children: [
        /* @__PURE__ */ jsxs("div", { className: "match-detail__team", children: [
          /* @__PURE__ */ jsx(TeamFlag, { code: match.teamA, size: 48 }),
          /* @__PURE__ */ jsx("span", { className: "match-detail__team-code", children: match.teamA }),
          /* @__PURE__ */ jsx("span", { className: "match-detail__team-full", children: TEAM_FULL[match.teamA] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "match-detail__scoreline", children: [
          /* @__PURE__ */ jsx("span", { children: match.scoreA !== null ? match.scoreA : "–" }),
          /* @__PURE__ */ jsx("span", { className: "match-detail__scoreline-sep", children: ":" }),
          /* @__PURE__ */ jsx("span", { children: match.scoreB !== null ? match.scoreB : "–" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "match-detail__team", children: [
          /* @__PURE__ */ jsx(TeamFlag, { code: match.teamB, size: 48 }),
          /* @__PURE__ */ jsx("span", { className: "match-detail__team-code", children: match.teamB }),
          /* @__PURE__ */ jsx("span", { className: "match-detail__team-full", children: TEAM_FULL[match.teamB] })
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "match-detail__status", children: /* @__PURE__ */ jsx(MatchStatusBadge, { match }) })
    ] }),
    hasPick && /* @__PURE__ */ jsxs("div", { className: "match-detail__my-pick", children: [
      /* @__PURE__ */ jsxs("div", { className: "match-detail__my-pick-left", children: [
        /* @__PURE__ */ jsx("span", { className: "match-detail__my-pick-label", children: "Your prediction" }),
        /* @__PURE__ */ jsxs(
          "span",
          {
            className: "match-detail__my-pick-score",
            style: { color: result ? resultColors[result] : "var(--fg-primary)" },
            children: [
              userPick.pickA,
              " : ",
              userPick.pickB
            ]
          }
        )
      ] }),
      isFinished && result && /* @__PURE__ */ jsxs(Badge, { variant: getResultVariant(result), children: [
        "+",
        getResultPoints(result),
        " ",
        getResultLabel(result)
      ] })
    ] }),
    hasPredictions && /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsxs("div", { className: "match-detail__preds-heading", children: [
        "Predictions · ",
        totalPreds,
        " players"
      ] }),
      /* @__PURE__ */ jsx("div", { className: "match-detail__preds-grid", children: groups2.map((g) => /* @__PURE__ */ jsx(PredictionGroupCard, { group: g, match }, g.key)) })
    ] }),
    !hasPredictions && /* @__PURE__ */ jsx("div", { className: "match-detail__empty", children: "Predictions will be revealed once the match begins." })
  ] });
}
const FILTER_TABS = [
  { id: "all", label: "All" },
  { id: "live", label: "Live" },
  { id: "upcoming", label: "Upcoming" },
  { id: "finished", label: "Finished" }
];
function MatchesScreen() {
  const [tab, setTab] = useState("all");
  const [selected, setSelected] = useState(null);
  const { userPicks } = useAuth();
  const filtered = MATCHES.filter((m) => {
    if (tab === "live") return m.status === "live";
    if (tab === "upcoming") return m.status === "upcoming";
    if (tab === "finished") return m.status === "finished";
    return true;
  });
  if (selected) {
    return /* @__PURE__ */ jsx(PageContainer, { children: /* @__PURE__ */ jsx(
      MatchDetail,
      {
        match: selected,
        onBack: () => setSelected(null),
        userPick: userPicks[selected.id]
      }
    ) });
  }
  return /* @__PURE__ */ jsxs(PageContainer, { children: [
    /* @__PURE__ */ jsxs("div", { className: "matches-screen__header", children: [
      /* @__PURE__ */ jsx(
        SectionHeader,
        {
          title: "Matches",
          subtitle: "FIFA World Cup 2026 · Group Stage"
        }
      ),
      /* @__PURE__ */ jsx(FilterTabs, { tabs: FILTER_TABS, active: tab, onChange: setTab })
    ] }),
    filtered.length === 0 && /* @__PURE__ */ jsx("div", { className: "matches-screen__empty", children: "No matches in this category" }),
    /* @__PURE__ */ jsx("div", { className: "matches-screen__grid", children: filtered.map((m) => /* @__PURE__ */ jsx(
      MatchCard,
      {
        match: m,
        onTap: () => setSelected(m),
        userPick: userPicks[m.id]
      },
      m.id
    )) })
  ] });
}
function meta$2() {
  return [{
    title: "Matches — FWC26 Quiniela"
  }];
}
const matches = UNSAFE_withComponentProps(function MatchesRoute() {
  return /* @__PURE__ */ jsx(MatchesScreen, {});
});
const route4 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: matches,
  meta: meta$2
}, Symbol.toStringTag, { value: "Module" }));
const QUALIFY = 2;
const STATS = ["mp", "w", "d", "l", "gf", "ga"];
function GroupTable({ standings }) {
  return /* @__PURE__ */ jsxs("div", { className: "group-table", children: [
    /* @__PURE__ */ jsxs("div", { className: "group-table__header", children: [
      /* @__PURE__ */ jsx("span", { children: "#" }),
      /* @__PURE__ */ jsx("span", { children: "Team" }),
      ["MP", "W", "D", "L", "GF", "GA"].map((h) => /* @__PURE__ */ jsx("span", { className: "group-table__col-center", children: h }, h)),
      /* @__PURE__ */ jsx("span", { className: "group-table__col-center group-table__header-pts", children: "Pts" })
    ] }),
    standings.map((t, i) => {
      const qualify = i < QUALIFY;
      return /* @__PURE__ */ jsxs(
        "div",
        {
          className: `group-table__row${qualify ? " group-table__row--qualify" : ""}`,
          children: [
            /* @__PURE__ */ jsx("span", { className: `group-table__pos${qualify ? " group-table__pos--qualify" : ""}`, children: i + 1 }),
            /* @__PURE__ */ jsxs("div", { className: "group-table__team", children: [
              /* @__PURE__ */ jsx(TeamFlag, { code: t.team, size: 24 }),
              /* @__PURE__ */ jsx("span", { className: "group-table__team-name", children: t.team })
            ] }),
            STATS.map((k) => /* @__PURE__ */ jsx("span", { className: "group-table__stat", children: t[k] }, String(k))),
            /* @__PURE__ */ jsx("span", { className: "group-table__pts", children: t.pts })
          ]
        },
        t.team
      );
    })
  ] });
}
const RESULT_COLORS$1 = {
  exact: "var(--color-green)",
  winner: "var(--color-gold)",
  miss: "var(--color-error)"
};
function GroupMatchRow({ match, userPick }) {
  const isFinished = match.status === "finished";
  const isLive = match.status === "live";
  const hasPick = userPick && userPick.pickA !== "" && userPick.pickB !== "";
  let result = null;
  if (isFinished && hasPick) {
    result = getPickResult(match, parseInt(String(userPick.pickA)), parseInt(String(userPick.pickB)));
  }
  return /* @__PURE__ */ jsxs("div", { className: "group-match-row", children: [
    /* @__PURE__ */ jsxs("div", { className: "group-match-row__teams", children: [
      /* @__PURE__ */ jsxs("div", { className: "group-match-row__side group-match-row__side--left", children: [
        /* @__PURE__ */ jsx("span", { className: "group-match-row__team-name", children: match.teamA }),
        /* @__PURE__ */ jsx(TeamFlag, { code: match.teamA, size: 20 })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "group-match-row__score", children: isFinished || isLive ? `${match.scoreA}:${match.scoreB}` : /* @__PURE__ */ jsx("span", { className: "group-match-row__time", children: match.time }) }),
      /* @__PURE__ */ jsxs("div", { className: "group-match-row__side", children: [
        /* @__PURE__ */ jsx(TeamFlag, { code: match.teamB, size: 20 }),
        /* @__PURE__ */ jsx("span", { className: "group-match-row__team-name", children: match.teamB })
      ] })
    ] }),
    hasPick && /* @__PURE__ */ jsxs("div", { className: "group-match-row__pick", children: [
      /* @__PURE__ */ jsx("span", { className: "group-match-row__pick-label", children: "You:" }),
      /* @__PURE__ */ jsxs(
        "span",
        {
          className: "group-match-row__pick-score",
          style: { color: result ? RESULT_COLORS$1[result] : "var(--fg-primary)" },
          children: [
            userPick.pickA,
            ":",
            userPick.pickB
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "group-match-row__result", children: [
      isFinished && hasPick && result && /* @__PURE__ */ jsxs(Badge, { variant: getResultVariant(result), children: [
        "+",
        getResultPoints(result)
      ] }),
      isLive && /* @__PURE__ */ jsxs(Badge, { variant: "error", children: [
        /* @__PURE__ */ jsx("span", { className: "badge__live-dot", children: "●" }),
        " ",
        match.time
      ] }),
      !isFinished && !isLive && /* @__PURE__ */ jsx("span", { className: "group-match-row__date", children: match.date })
    ] })
  ] });
}
function GroupPanel({ groupId }) {
  const { userPicks } = useAuth();
  const standings = calcGroupStandings(groupId, null);
  const groupMatches = MATCHES.filter((m) => m.group === groupId).sort((a, b) => a.id - b.id);
  return /* @__PURE__ */ jsxs("div", { className: "group-panel", children: [
    /* @__PURE__ */ jsxs("div", { className: "group-panel__title", children: [
      "Group ",
      groupId
    ] }),
    /* @__PURE__ */ jsx(GroupTable, { standings }),
    /* @__PURE__ */ jsxs("div", { className: "group-panel__matches", children: [
      /* @__PURE__ */ jsx("div", { className: "group-panel__matches-heading", children: "Matches" }),
      groupMatches.map((m) => /* @__PURE__ */ jsx(GroupMatchRow, { match: m, userPick: userPicks[m.id] }, m.id))
    ] })
  ] });
}
function GroupsScreen() {
  return /* @__PURE__ */ jsxs(PageContainer, { wide: true, children: [
    /* @__PURE__ */ jsx(
      SectionHeader,
      {
        title: "Group Standings",
        subtitle: "FIFA World Cup 2026 · Group Stage"
      }
    ),
    /* @__PURE__ */ jsx("div", { className: "groups-screen__grid", children: Object.keys(GROUPS).map((g) => /* @__PURE__ */ jsx(GroupPanel, { groupId: g }, g)) })
  ] });
}
function meta$1() {
  return [{
    title: "Groups — FWC26 Quiniela"
  }];
}
const groups = UNSAFE_withComponentProps(function GroupsRoute() {
  return /* @__PURE__ */ jsx(GroupsScreen, {});
});
const route5 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: groups,
  meta: meta$1
}, Symbol.toStringTag, { value: "Module" }));
function TopScorerPicker({ value, onChange, disabled }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  const filtered = search ? TOP_SCORER_SUGGESTIONS.filter(
    (p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.team.toLowerCase().includes(search.toLowerCase())
  ) : TOP_SCORER_SUGGESTIONS;
  const handleSelect = (p) => {
    onChange == null ? void 0 : onChange(p);
    setOpen(false);
    setSearch("");
  };
  return /* @__PURE__ */ jsxs("div", { className: "ts-picker", ref, children: [
    /* @__PURE__ */ jsxs(
      "div",
      {
        className: `ts-picker__trigger${disabled ? " ts-picker__trigger--disabled" : ""}`,
        onClick: () => !disabled && setOpen(!open),
        children: [
          value ? /* @__PURE__ */ jsxs("div", { className: "ts-picker__trigger-value", children: [
            /* @__PURE__ */ jsx(TeamFlag, { code: value.team, size: 24 }),
            /* @__PURE__ */ jsx("span", { className: "ts-picker__trigger-name", children: value.name })
          ] }) : /* @__PURE__ */ jsx("span", { className: "ts-picker__placeholder", children: "Select top scorer prediction..." }),
          !disabled && /* @__PURE__ */ jsx(
            "svg",
            {
              className: `ts-picker__chevron${open ? " ts-picker__chevron--open" : ""}`,
              width: "16",
              height: "16",
              viewBox: "0 0 24 24",
              fill: "var(--fg-tertiary)",
              children: /* @__PURE__ */ jsx("path", { d: "M7 10l5 5 5-5z" })
            }
          )
        ]
      }
    ),
    open && !disabled && /* @__PURE__ */ jsxs("div", { className: "ts-picker__dropdown", children: [
      /* @__PURE__ */ jsx("div", { className: "ts-picker__search-wrap", children: /* @__PURE__ */ jsx(
        "input",
        {
          type: "text",
          className: "ts-picker__search",
          value: search,
          onChange: (e) => setSearch(e.target.value),
          placeholder: "Search player or team...",
          autoFocus: true
        }
      ) }),
      /* @__PURE__ */ jsx("div", { className: "ts-picker__list", children: filtered.length === 0 ? /* @__PURE__ */ jsx("div", { className: "ts-picker__empty", children: "No players found" }) : filtered.map((p) => /* @__PURE__ */ jsxs(
        "div",
        {
          className: `ts-picker__option${(value == null ? void 0 : value.name) === p.name ? " ts-picker__option--selected" : ""}`,
          onClick: () => handleSelect(p),
          children: [
            /* @__PURE__ */ jsx(TeamFlag, { code: p.team, size: 22 }),
            /* @__PURE__ */ jsx("span", { className: "ts-picker__option-name", children: p.name }),
            /* @__PURE__ */ jsx("span", { className: "ts-picker__option-team", children: p.team })
          ]
        },
        p.name
      )) })
    ] })
  ] });
}
function PredictionEntryForm({ onSubmit }) {
  const [picks, setPicks] = useState({});
  const [topScorer, setTopScorer] = useState(null);
  const [showErrors, setShowErrors] = useState(false);
  const updatePick = (matchId, pickA, pickB) => {
    setPicks((prev) => ({ ...prev, [matchId]: { pickA, pickB } }));
  };
  const filledCount = Object.values(picks).filter(
    (p) => p.pickA !== "" && p.pickB !== ""
  ).length;
  const totalMatches = MATCHES.length;
  const allFilled = filledCount === totalMatches && topScorer !== null;
  const progress = (filledCount + (topScorer ? 1 : 0)) / (totalMatches + 1) * 100;
  const handleSubmit = () => {
    if (!allFilled) {
      setShowErrors(true);
      return;
    }
    onSubmit(picks, topScorer);
  };
  const groupEntries = Object.keys(GROUPS).map((gId) => ({
    id: gId,
    matches: MATCHES.filter((m) => m.group === gId)
  }));
  return /* @__PURE__ */ jsxs(PageContainer, { wide: true, children: [
    /* @__PURE__ */ jsxs("div", { className: "pred-form__heading", children: [
      /* @__PURE__ */ jsx("div", { className: "pred-form__title", children: "Enter Your Predictions" }),
      /* @__PURE__ */ jsx("p", { className: "pred-form__subtitle", children: "Fill in your predicted score for every match and pick the tournament top scorer. Once submitted, predictions are final and cannot be changed." })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "pred-form__progress", children: /* @__PURE__ */ jsxs("div", { className: "pred-form__progress-inner", children: [
      /* @__PURE__ */ jsxs("div", { className: "pred-form__progress-labels", children: [
        /* @__PURE__ */ jsx("span", { className: "pred-form__progress-label", children: "Progress" }),
        /* @__PURE__ */ jsxs("span", { className: `pred-form__progress-count${allFilled ? " pred-form__progress-count--done" : ""}`, children: [
          filledCount,
          "/",
          totalMatches,
          " matches",
          topScorer ? " + top scorer" : ""
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "pred-form__progress-track", children: /* @__PURE__ */ jsx(
        "div",
        {
          className: `pred-form__progress-fill${allFilled ? " pred-form__progress-fill--done" : ""}`,
          style: { width: `${progress}%` }
        }
      ) })
    ] }) }),
    /* @__PURE__ */ jsx("div", { className: "pred-form__groups", children: groupEntries.map((g) => {
      const standings = calcGroupStandings(g.id, picks);
      const filledInGroup = g.matches.filter(
        (m) => {
          var _a, _b;
          return ((_a = picks[m.id]) == null ? void 0 : _a.pickA) !== "" && ((_b = picks[m.id]) == null ? void 0 : _b.pickB) !== "" && picks[m.id];
        }
      ).length;
      return /* @__PURE__ */ jsxs("div", { className: "pred-form__group", children: [
        /* @__PURE__ */ jsxs("div", { className: "pred-form__group-header", children: [
          "Group ",
          g.id,
          /* @__PURE__ */ jsxs("span", { className: "pred-form__group-count", children: [
            filledInGroup,
            "/",
            g.matches.length
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "pred-form__mini-standings", children: [
          /* @__PURE__ */ jsxs("div", { className: "pred-form__mini-header", children: [
            /* @__PURE__ */ jsx("span", { children: "#" }),
            /* @__PURE__ */ jsx("span", { children: "Team" }),
            /* @__PURE__ */ jsx("span", { className: "pred-form__mini-col-center", children: "GD" }),
            /* @__PURE__ */ jsx("span", { className: "pred-form__mini-col-center", children: "GF" }),
            /* @__PURE__ */ jsx("span", { className: "pred-form__mini-col-pts", children: "Pts" })
          ] }),
          standings.map((t, i) => {
            const qualify = i < 2;
            const gdPos = t.gd > 0;
            const gdNeg = t.gd < 0;
            return /* @__PURE__ */ jsxs("div", { className: "pred-form__mini-row", children: [
              /* @__PURE__ */ jsx("span", { className: `pred-form__mini-pos${qualify ? " pred-form__mini-pos--qualify" : ""}`, children: i + 1 }),
              /* @__PURE__ */ jsxs("div", { className: "pred-form__mini-team", children: [
                /* @__PURE__ */ jsx(TeamFlag, { code: t.team, size: 18 }),
                /* @__PURE__ */ jsx("span", { className: `pred-form__mini-team-name${qualify ? " pred-form__mini-team-name--qualify" : ""}`, children: t.team })
              ] }),
              /* @__PURE__ */ jsxs("span", { className: `pred-form__mini-gd${gdPos ? " pred-form__mini-gd--pos" : gdNeg ? " pred-form__mini-gd--neg" : ""}`, children: [
                t.gd > 0 ? "+" : "",
                t.gd
              ] }),
              /* @__PURE__ */ jsx("span", { className: "pred-form__mini-gf", children: t.gf }),
              /* @__PURE__ */ jsx("span", { className: "pred-form__mini-pts", children: t.pts })
            ] }, t.team);
          })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "pred-form__matches", children: g.matches.map((m) => {
          const p = picks[m.id] ?? { pickA: "", pickB: "" };
          const isEmpty = p.pickA === "" || p.pickB === "";
          const hasError = showErrors && isEmpty;
          return /* @__PURE__ */ jsxs("div", { className: "pred-form__match-row", children: [
            /* @__PURE__ */ jsx("span", { className: "pred-form__match-date", children: m.date }),
            /* @__PURE__ */ jsxs("div", { className: "pred-form__match-teams", children: [
              /* @__PURE__ */ jsxs("div", { className: "pred-form__match-side", children: [
                /* @__PURE__ */ jsx("span", { className: "pred-form__match-team-name", children: m.teamA }),
                /* @__PURE__ */ jsx(TeamFlag, { code: m.teamA, size: 22 })
              ] }),
              /* @__PURE__ */ jsx(
                "input",
                {
                  type: "number",
                  min: "0",
                  max: "20",
                  className: `pred-form__match-input${hasError ? " pred-form__match-input--error" : ""}`,
                  value: p.pickA,
                  onChange: (e) => updatePick(m.id, e.target.value, p.pickB),
                  placeholder: "–"
                }
              ),
              /* @__PURE__ */ jsx("span", { className: "pred-form__match-sep", children: ":" }),
              /* @__PURE__ */ jsx(
                "input",
                {
                  type: "number",
                  min: "0",
                  max: "20",
                  className: `pred-form__match-input${hasError ? " pred-form__match-input--error" : ""}`,
                  value: p.pickB,
                  onChange: (e) => updatePick(m.id, p.pickA, e.target.value),
                  placeholder: "–"
                }
              ),
              /* @__PURE__ */ jsxs("div", { className: "pred-form__match-side pred-form__match-side--right", children: [
                /* @__PURE__ */ jsx(TeamFlag, { code: m.teamB, size: 22 }),
                /* @__PURE__ */ jsx("span", { className: "pred-form__match-team-name", children: m.teamB })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "pred-form__match-icon", children: [
              !isEmpty && /* @__PURE__ */ jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "var(--color-green)", children: /* @__PURE__ */ jsx("path", { d: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" }) }),
              hasError && /* @__PURE__ */ jsx("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "var(--color-error)", children: /* @__PURE__ */ jsx("path", { d: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" }) })
            ] })
          ] }, m.id);
        }) })
      ] }, g.id);
    }) }),
    /* @__PURE__ */ jsxs("div", { className: `pred-form__scorer${showErrors && !topScorer ? " pred-form__scorer--error" : ""}`, children: [
      /* @__PURE__ */ jsxs("div", { className: "pred-form__scorer-heading", children: [
        /* @__PURE__ */ jsx("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "var(--color-gold)", children: /* @__PURE__ */ jsx("path", { d: "M7.5 21H2V9h5.5v12zm7.25-18h-5.5v18h5.5V3zM22 11h-5.5v10H22V11z" }) }),
        "Top Scorer Prediction",
        /* @__PURE__ */ jsx("span", { className: "pred-form__scorer-bonus", children: "+15 bonus if correct" })
      ] }),
      /* @__PURE__ */ jsx(TopScorerPicker, { value: topScorer, onChange: setTopScorer })
    ] }),
    showErrors && !allFilled && /* @__PURE__ */ jsx("div", { className: "pred-form__error-msg", children: "Please fill in all match predictions and select a top scorer before submitting." }),
    /* @__PURE__ */ jsx("div", { className: "pred-form__submit-row", children: /* @__PURE__ */ jsx(
      "button",
      {
        className: `pred-form__submit${allFilled ? " pred-form__submit--ready" : " pred-form__submit--disabled"}`,
        onClick: handleSubmit,
        children: "Submit Predictions"
      }
    ) })
  ] });
}
const RESULT_COLORS = {
  exact: "var(--color-green)",
  winner: "var(--color-gold)",
  miss: "var(--color-error)"
};
function ProfileReadOnly({ userPicks, topScorer, onLogout }) {
  const me = PLAYERS.find((p) => p.id === ME_ID);
  const matchdays = [1, 2, 3].map((day) => ({
    day,
    label: `Matchday ${day}`,
    matches: MATCHES.filter((m) => m.day === day)
  }));
  const finishedWithPicks = MATCHES.filter((m) => {
    if (m.status !== "finished") return false;
    const p = userPicks[m.id];
    return p && p.pickA !== "" && p.pickB !== "";
  });
  const exactCount = finishedWithPicks.filter((m) => {
    const p = userPicks[m.id];
    return getPickResult(m, parseInt(String(p.pickA)), parseInt(String(p.pickB))) === "exact";
  }).length;
  const winnerCount = finishedWithPicks.filter((m) => {
    const p = userPicks[m.id];
    return getPickResult(m, parseInt(String(p.pickA)), parseInt(String(p.pickB))) === "winner";
  }).length;
  const missed = finishedWithPicks.length - exactCount - winnerCount;
  const accuracy = finishedWithPicks.length > 0 ? Math.round((exactCount + winnerCount) / finishedWithPicks.length * 100) + "%" : "—";
  const stats = [
    { label: "Exact scores", value: exactCount, color: "var(--color-green)" },
    { label: "Correct winner", value: winnerCount, color: "var(--color-gold)" },
    { label: "Missed", value: missed, color: "var(--color-error)" },
    { label: "Accuracy", value: accuracy, color: "var(--color-info)" }
  ];
  return /* @__PURE__ */ jsxs(PageContainer, { children: [
    /* @__PURE__ */ jsxs("div", { className: "profile-ro__header", children: [
      /* @__PURE__ */ jsx(Avatar, { name: me.name, index: me.id - 1, size: 64 }),
      /* @__PURE__ */ jsxs("div", { className: "profile-ro__header-info", children: [
        /* @__PURE__ */ jsx("div", { className: "profile-ro__name", children: "Your Profile" }),
        /* @__PURE__ */ jsxs("div", { className: "profile-ro__rank-row", children: [
          /* @__PURE__ */ jsxs("span", { className: "profile-ro__rank-label", children: [
            "Rank ",
            /* @__PURE__ */ jsxs("span", { className: "profile-ro__rank-num", children: [
              "#",
              me.rank
            ] })
          ] }),
          /* @__PURE__ */ jsx(PositionChange, { current: me.rank, previous: me.prevRank }),
          /* @__PURE__ */ jsxs("span", { className: "profile-ro__pts", children: [
            me.pts,
            " pts"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsx("button", { className: "profile-ro__logout", onClick: onLogout, children: "Log Out" })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "profile-ro__stats", children: stats.map((s, i) => /* @__PURE__ */ jsxs("div", { className: "profile-ro__stat-card", children: [
      /* @__PURE__ */ jsx("div", { className: "profile-ro__stat-value", style: { color: s.color }, children: s.value }),
      /* @__PURE__ */ jsx("div", { className: "profile-ro__stat-label", children: s.label })
    ] }, i)) }),
    /* @__PURE__ */ jsxs("div", { className: "profile-ro__scorer", children: [
      /* @__PURE__ */ jsxs("div", { className: "profile-ro__scorer-heading", children: [
        /* @__PURE__ */ jsx("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "var(--color-gold)", children: /* @__PURE__ */ jsx("path", { d: "M7.5 21H2V9h5.5v12zm7.25-18h-5.5v18h5.5V3zM22 11h-5.5v10H22V11z" }) }),
        "Top Scorer Prediction"
      ] }),
      /* @__PURE__ */ jsx(TopScorerPicker, { value: topScorer, disabled: true }),
      /* @__PURE__ */ jsx("p", { className: "profile-ro__scorer-note", children: "+15 bonus points if correct at end of tournament" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "profile-ro__preds-heading", children: [
      "Your Predictions",
      /* @__PURE__ */ jsx(Badge, { variant: "default", children: "Locked" })
    ] }),
    matchdays.map((md) => /* @__PURE__ */ jsxs("div", { className: "profile-ro__matchday", children: [
      /* @__PURE__ */ jsx("div", { className: "profile-ro__matchday-label", children: md.label }),
      /* @__PURE__ */ jsx("div", { className: "profile-ro__match-list", children: md.matches.map((m) => {
        const pick = userPicks[m.id];
        const hasPick = pick && pick.pickA !== "" && pick.pickB !== "";
        const isFinished = m.status === "finished";
        const isLive = m.status === "live";
        let result = null;
        if (isFinished && hasPick) {
          result = getPickResult(m, parseInt(String(pick.pickA)), parseInt(String(pick.pickB)));
        }
        return /* @__PURE__ */ jsxs("div", { className: "profile-ro__match-row", children: [
          /* @__PURE__ */ jsxs("div", { className: "profile-ro__match-teams", children: [
            /* @__PURE__ */ jsx(TeamFlag, { code: m.teamA, size: 20 }),
            /* @__PURE__ */ jsx("span", { className: "profile-ro__match-vs", children: "vs" }),
            /* @__PURE__ */ jsx(TeamFlag, { code: m.teamB, size: 20 })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "profile-ro__match-result", children: isFinished || isLive ? /* @__PURE__ */ jsxs("span", { className: "profile-ro__match-score-actual", children: [
            m.scoreA,
            ":",
            m.scoreB
          ] }) : /* @__PURE__ */ jsx("span", { className: "profile-ro__match-date", children: m.date }) }),
          /* @__PURE__ */ jsxs("div", { className: "profile-ro__match-pick-wrap", children: [
            /* @__PURE__ */ jsx("span", { className: "profile-ro__match-pick-label", children: "Your pick:" }),
            /* @__PURE__ */ jsx(
              "span",
              {
                className: "profile-ro__match-pick-score",
                style: { color: result ? RESULT_COLORS[result] : "var(--fg-primary)" },
                children: hasPick ? `${pick.pickA}:${pick.pickB}` : "—"
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "profile-ro__match-badge", children: [
            isFinished && hasPick && result && /* @__PURE__ */ jsxs(Badge, { variant: getResultVariant(result), children: [
              "+",
              getResultPoints(result)
            ] }),
            isLive && /* @__PURE__ */ jsxs(Badge, { variant: "error", children: [
              /* @__PURE__ */ jsx("span", { className: "badge__live-dot", children: "●" }),
              " Live"
            ] })
          ] })
        ] }, m.id);
      }) })
    ] }, md.day))
  ] });
}
function ProfileScreen() {
  const { submitted, userPicks, topScorer, submitPredictions, logout } = useAuth();
  const navigate = useNavigate();
  const handleSubmit = (picks, scorer) => {
    submitPredictions(picks, scorer);
    navigate("/rankings");
  };
  const handleLogout = () => {
    logout();
    navigate("/login");
  };
  if (!submitted) {
    return /* @__PURE__ */ jsx(PredictionEntryForm, { onSubmit: handleSubmit });
  }
  return /* @__PURE__ */ jsx(
    ProfileReadOnly,
    {
      userPicks,
      topScorer,
      onLogout: handleLogout
    }
  );
}
function meta() {
  return [{
    title: "Profile — FWC26 Quiniela"
  }];
}
const profile = UNSAFE_withComponentProps(function ProfileRoute() {
  return /* @__PURE__ */ jsx(ProfileScreen, {});
});
const route6 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: profile,
  meta
}, Symbol.toStringTag, { value: "Module" }));
const serverManifest = { "entry": { "module": "/assets/entry.client-B6fZX-2t.js", "imports": ["/assets/chunk-4N6VE7H7-C8mkwFVI.js"], "css": [] }, "routes": { "root": { "id": "root", "parentId": void 0, "path": "", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/root-B3Y4_dyg.js", "imports": ["/assets/chunk-4N6VE7H7-C8mkwFVI.js", "/assets/auth-context-X3whFM7d.js", "/assets/Avatar-DMOsYlkB.js", "/assets/mock-data-Csg7Q-gR.js"], "css": ["/assets/root-BlzoYdp6.css", "/assets/Avatar-oI7mgl-L.css"], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/_index": { "id": "routes/_index", "parentId": "root", "path": void 0, "index": true, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": false, "hasErrorBoundary": false, "module": "/assets/_index-l0sNRNKZ.js", "imports": [], "css": [], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/login": { "id": "routes/login", "parentId": "root", "path": "login", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/login-KUfEcuSb.js", "imports": ["/assets/chunk-4N6VE7H7-C8mkwFVI.js", "/assets/auth-context-X3whFM7d.js"], "css": ["/assets/login-Ci6Wjubm.css"], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/rankings": { "id": "routes/rankings", "parentId": "root", "path": "rankings", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/rankings-BXKwB3Gw.js", "imports": ["/assets/chunk-4N6VE7H7-C8mkwFVI.js", "/assets/PageContainer-BB0-kUDe.js", "/assets/SectionHeader-BYOcD7aX.js", "/assets/Avatar-DMOsYlkB.js", "/assets/PositionChange-CsW_1CAd.js", "/assets/mock-data-Csg7Q-gR.js"], "css": ["/assets/rankings-CVjYM_iT.css", "/assets/PageContainer-CrfmAFzK.css", "/assets/SectionHeader-D6rNchqF.css", "/assets/Avatar-oI7mgl-L.css", "/assets/PositionChange-CWC9x5xo.css"], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/matches": { "id": "routes/matches", "parentId": "root", "path": "matches", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/matches-DHWeKKZj.js", "imports": ["/assets/chunk-4N6VE7H7-C8mkwFVI.js", "/assets/PageContainer-BB0-kUDe.js", "/assets/SectionHeader-BYOcD7aX.js", "/assets/Badge-D3qoCnKK.js", "/assets/Avatar-DMOsYlkB.js", "/assets/mock-data-Csg7Q-gR.js", "/assets/auth-context-X3whFM7d.js"], "css": ["/assets/matches-C4TB2BVo.css", "/assets/PageContainer-CrfmAFzK.css", "/assets/SectionHeader-D6rNchqF.css", "/assets/Badge-CF7p-qeZ.css", "/assets/Avatar-oI7mgl-L.css"], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/groups": { "id": "routes/groups", "parentId": "root", "path": "groups", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/groups-Ludw3eqX.js", "imports": ["/assets/chunk-4N6VE7H7-C8mkwFVI.js", "/assets/PageContainer-BB0-kUDe.js", "/assets/SectionHeader-BYOcD7aX.js", "/assets/Badge-D3qoCnKK.js", "/assets/mock-data-Csg7Q-gR.js", "/assets/auth-context-X3whFM7d.js"], "css": ["/assets/groups-Cp4GQ_C3.css", "/assets/PageContainer-CrfmAFzK.css", "/assets/SectionHeader-D6rNchqF.css", "/assets/Badge-CF7p-qeZ.css"], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 }, "routes/profile": { "id": "routes/profile", "parentId": "root", "path": "profile", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasClientMiddleware": false, "hasDefaultExport": true, "hasErrorBoundary": false, "module": "/assets/profile-B_U5PWW6.js", "imports": ["/assets/chunk-4N6VE7H7-C8mkwFVI.js", "/assets/auth-context-X3whFM7d.js", "/assets/PageContainer-BB0-kUDe.js", "/assets/Badge-D3qoCnKK.js", "/assets/mock-data-Csg7Q-gR.js", "/assets/Avatar-DMOsYlkB.js", "/assets/PositionChange-CsW_1CAd.js"], "css": ["/assets/profile-DbED_pSu.css", "/assets/PageContainer-CrfmAFzK.css", "/assets/Badge-CF7p-qeZ.css", "/assets/Avatar-oI7mgl-L.css", "/assets/PositionChange-CWC9x5xo.css"], "clientActionModule": void 0, "clientLoaderModule": void 0, "clientMiddlewareModule": void 0, "hydrateFallbackModule": void 0 } }, "url": "/assets/manifest-b55ca5da.js", "version": "b55ca5da", "sri": void 0 };
const assetsBuildDirectory = "build\\client";
const basename = "/";
const future = { "unstable_optimizeDeps": false, "v8_passThroughRequests": false, "unstable_trailingSlashAwareDataRequests": false, "unstable_previewServerPrerendering": false, "v8_middleware": false, "v8_splitRouteModules": false, "v8_viteEnvironmentApi": false };
const ssr = true;
const isSpaMode = false;
const prerender = [];
const routeDiscovery = { "mode": "lazy", "manifestPath": "/__manifest" };
const publicPath = "/";
const entry = { module: entryServer };
const routes = {
  "root": {
    id: "root",
    parentId: void 0,
    path: "",
    index: void 0,
    caseSensitive: void 0,
    module: route0
  },
  "routes/_index": {
    id: "routes/_index",
    parentId: "root",
    path: void 0,
    index: true,
    caseSensitive: void 0,
    module: route1
  },
  "routes/login": {
    id: "routes/login",
    parentId: "root",
    path: "login",
    index: void 0,
    caseSensitive: void 0,
    module: route2
  },
  "routes/rankings": {
    id: "routes/rankings",
    parentId: "root",
    path: "rankings",
    index: void 0,
    caseSensitive: void 0,
    module: route3
  },
  "routes/matches": {
    id: "routes/matches",
    parentId: "root",
    path: "matches",
    index: void 0,
    caseSensitive: void 0,
    module: route4
  },
  "routes/groups": {
    id: "routes/groups",
    parentId: "root",
    path: "groups",
    index: void 0,
    caseSensitive: void 0,
    module: route5
  },
  "routes/profile": {
    id: "routes/profile",
    parentId: "root",
    path: "profile",
    index: void 0,
    caseSensitive: void 0,
    module: route6
  }
};
const allowedActionOrigins = false;
export {
  allowedActionOrigins,
  serverManifest as assets,
  assetsBuildDirectory,
  basename,
  entry,
  future,
  isSpaMode,
  prerender,
  publicPath,
  routeDiscovery,
  routes,
  ssr
};
