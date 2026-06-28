-- Fixes corrupted venue/venue_city/venue_country on 14 knockout-stage matches.
-- See PENDING.md item 6. The original knockout venue seed (migrations 9-10)
-- landed a rotation of the correct (venue, venue_city, venue_country) triples
-- across the wrong rows (e.g. match 537423 held Boston's Gillette Stadium,
-- which belongs on 537415; 537415 held Monterrey's; etc.).
--
-- The correct triple per match id was re-derived by cross-referencing each
-- row's fifa_match_id against FIFA's calendar API Stadium.CityName (the
-- authoritative kickoff city — NOT Stadium.Name, which is a generic
-- placeholder), then mapping that city to the canonical venue string used by
-- the 72 uncorrupted GROUP_STAGE rows. All 14 verified against FIFA on
-- 2026-06-28; venue_city strings follow our DB convention
-- ("New York New Jersey" for MetLife, not FIFA's raw "New Jersey").

update public.matches as m set
  venue         = v.venue,
  venue_city    = v.venue_city,
  venue_country = v.venue_country
from (values
  (537423, 'NRG Stadium',             'Houston',                'USA'),
  (537415, 'Gillette Stadium',        'Boston',                 'USA'),
  (537418, 'Estadio BBVA',            'Monterrey',              'MEX'),
  (537424, 'AT&T Stadium',            'Dallas',                 'USA'),
  (537416, 'MetLife Stadium',         'New York New Jersey',    'USA'),
  (537422, 'Lumen Field',             'Seattle',                'USA'),
  (537421, 'Levi''s Stadium',         'San Francisco Bay Area', 'USA'),
  (537420, 'SoFi Stadium',            'Los Angeles',            'USA'),
  (537419, 'BMO Field',               'Toronto',                'CAN'),
  (537428, 'AT&T Stadium',            'Dallas',                 'USA'),
  (537427, 'Hard Rock Stadium',       'Miami',                  'USA'),
  (537430, 'Arrowhead Stadium',       'Kansas City',            'USA'),
  (537376, 'NRG Stadium',             'Houston',                'USA'),
  (537375, 'Lincoln Financial Field', 'Philadelphia',           'USA')
) as v(id, venue, venue_city, venue_country)
where m.id = v.id;
