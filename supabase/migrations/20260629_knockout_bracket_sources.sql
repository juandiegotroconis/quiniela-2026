-- Knockout bracket feeder graph (Option B — target-side).
--
-- Each knockout match's two slots are fed by an earlier match's outcome. FIFA's
-- calendar encodes this with PlaceHolderA/PlaceHolderB ("W74" = winner of match
-- 74, "RU101" = runner-up/loser of match 101), where PlaceHolderA maps to the
-- home slot and PlaceHolderB to the away slot (verified against resolved R32
-- rows: A -> Home, B -> Away).
--
-- We store the resolved feeder on the *receiving* match so the prediction form
-- can cascade a user's winner picks into the next round's home/away slots
-- without a reverse lookup:
--   home_source_match_id / away_source_match_id -> matches.id of the feeder
--   home_source_outcome  / away_source_outcome  -> 'winner' | 'loser'
-- Only the third-place play-off uses 'loser' (the two semi-final losers).
--
-- Round-of-32 matches are fed from group standings (not another match), so
-- their source columns stay null. The mapping below is static for WC2026 and is
-- the single source of truth for the bracket structure; it joins on
-- fifa_match_id (= FIFA IdMatch), which is populated for all 32 knockout rows.

alter table public.matches
  add column if not exists home_source_match_id integer references public.matches(id),
  add column if not exists away_source_match_id integer references public.matches(id),
  add column if not exists home_source_outcome text check (home_source_outcome in ('winner', 'loser')),
  add column if not exists away_source_outcome text check (away_source_outcome in ('winner', 'loser'));

with routing(target_fifa, home_fifa, home_outcome, away_fifa, away_outcome) as (
  values
    -- Round of 16 (home = winner of A-feeder, away = winner of B-feeder)
    ('400021533', '400021513', 'winner', '400021523', 'winner'), -- 89: W74 / W77
    ('400021530', '400021518', 'winner', '400021522', 'winner'), -- 90: W73 / W75
    ('400021532', '400021516', 'winner', '400021514', 'winner'), -- 91: W76 / W78
    ('400021531', '400021520', 'winner', '400021512', 'winner'), -- 92: W79 / W80
    ('400021529', '400021526', 'winner', '400021519', 'winner'), -- 93: W83 / W84
    ('400021534', '400021524', 'winner', '400021525', 'winner'), -- 94: W81 / W82
    ('400021528', '400021521', 'winner', '400021515', 'winner'), -- 95: W86 / W88
    ('400021535', '400021527', 'winner', '400021517', 'winner'), -- 96: W85 / W87
    -- Quarter-finals
    ('400021536', '400021533', 'winner', '400021530', 'winner'), -- 97: W89 / W90
    ('400021538', '400021529', 'winner', '400021534', 'winner'), -- 98: W93 / W94
    ('400021539', '400021532', 'winner', '400021531', 'winner'), -- 99: W91 / W92
    ('400021537', '400021528', 'winner', '400021535', 'winner'), -- 100: W95 / W96
    -- Semi-finals
    ('400021541', '400021536', 'winner', '400021538', 'winner'), -- 101: W97 / W98
    ('400021540', '400021539', 'winner', '400021537', 'winner'), -- 102: W99 / W100
    -- Third-place play-off (the two semi-final losers)
    ('400021542', '400021541', 'loser',  '400021540', 'loser'),  -- 103: RU101 / RU102
    -- Final
    ('400021543', '400021541', 'winner', '400021540', 'winner')  -- 104: W101 / W102
)
update public.matches m
set home_source_match_id = hs.id,
    home_source_outcome  = r.home_outcome,
    away_source_match_id = aw.id,
    away_source_outcome  = r.away_outcome
from routing r
join public.matches hs on hs.fifa_match_id = r.home_fifa
join public.matches aw on aw.fifa_match_id = r.away_fifa
where m.fifa_match_id = r.target_fifa;
