---
name: project-i18n-setup
description: i18n infrastructure added to quiniela-2026 — file locations, key conventions, and hook design
metadata:
  type: project
---

i18n infrastructure was created with these files:
- `src/locales/en.json` — English translation source (all keys)
- `src/locales/es.json` — Spanish translations (Latin American)
- `src/hooks/useTranslation.ts` — self-contained hook returning `{ t, language, setLanguage }`

**Why:** The app targets Latin American users and needed a bilingual (EN/ES) system without adding any npm dependencies.

**How to apply:** When adding new user-facing strings, add UPPER_SNAKE_CASE keys to both JSON files and use `const { t } = useTranslation()` in the component. The hook persists language choice to `localStorage` under key `quiniela_lang`. No context/provider is required — the hook is self-contained with local state.

Key naming conventions established:
- Prefix by feature area: `AUTH_`, `PRED_FORM_`, `PROFILE_READONLY_`, `JOIN_QUINIELA_`, `MATCH_DETAIL_`, `RANKINGS_`, `MATCHES_`, `GROUPS_`, `NAV_`, `MATCH_RESULT_`, `TOP_SCORER_`, `PLAYER_PROFILE_`, `BANNER_`
- Loading states use the same key root with `_LOADING` suffix
- Strings with embedded dynamic values (counts, names) are split at the dynamic boundary — the component interpolates separately

Components with the most translatable content: `PredictionEntryForm` (~20 strings), `AuthScreen` (~18 strings), `ProfileReadOnly` (~12 strings), `LeaderboardScreen` (~10 strings), `MatchesScreen` (~10 strings).

Tricky interpolation cases (components embed dynamic values inline):
- `Rankings subtitle`: `"Friends League · N players"` — key `RANKINGS_PLAYER_COUNT_SINGULAR/PLURAL` are provided; component must build the string.
- `Match detail predictions heading`: `"Predictions · N players"` — `MATCH_DETAIL_PREDICTIONS_HEADING` + `MATCH_DETAIL_PLAYERS_SUFFIX`.
- `Avatar color saving state`: component conditionally appends `· Saving…` — two keys provided (`PROFILE_AVATAR_COLOR_LABEL`, `PROFILE_AVATAR_COLOR_SAVING`).
- `Progress count`: `"N/M matches + top scorer"` — `PRED_FORM_MATCHES_COUNT` and `PRED_FORM_TOP_SCORER_COUNT` provided; count numbers come from state.
- `Profile header rank`: `"Rank #N"` — `PROFILE_RANK_LABEL` is the label; number comes from data.
