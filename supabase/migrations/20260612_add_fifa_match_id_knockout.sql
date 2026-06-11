-- FIFA match IDs for the 32 knockout-stage matches, joined by exact utc_date
-- against FIFA's calendar/matches endpoint for season 285023 (the 32 knockout
-- entries there have null Home/Away placeholders, so they're matched on
-- kickoff time alone -- both date sets are identical with no duplicates,
-- making the join unambiguous).
update public.matches set fifa_match_id = case id
  when 537417 then '400021518'
  when 537423 then '400021516'
  when 537415 then '400021513'
  when 537418 then '400021522'
  when 537424 then '400021514'
  when 537416 then '400021523'
  when 537425 then '400021520'
  when 537426 then '400021512'
  when 537422 then '400021525'
  when 537421 then '400021524'
  when 537420 then '400021519'
  when 537419 then '400021526'
  when 537429 then '400021527'
  when 537428 then '400021515'
  when 537427 then '400021521'
  when 537430 then '400021517'
  when 537376 then '400021530'
  when 537375 then '400021533'
  when 537377 then '400021532'
  when 537378 then '400021531'
  when 537379 then '400021529'
  when 537380 then '400021534'
  when 537381 then '400021528'
  when 537382 then '400021535'
  when 537383 then '400021536'
  when 537384 then '400021538'
  when 537385 then '400021539'
  when 537386 then '400021537'
  when 537387 then '400021541'
  when 537388 then '400021540'
  when 537389 then '400021542'
  when 537390 then '400021543'
  else fifa_match_id
end
where stage != 'GROUP_STAGE';
