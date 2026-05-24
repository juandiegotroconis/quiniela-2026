import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  index('routes/_index.tsx'),
  route('login', 'routes/login.tsx'),
  route('rankings', 'routes/rankings.tsx'),
  route('matches', 'routes/matches.tsx'),
  route('groups', 'routes/groups.tsx'),
  route('profile', 'routes/profile.tsx'),
] satisfies RouteConfig;
