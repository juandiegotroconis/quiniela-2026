-- Host city for each match's venue, sourced from the FIFA World Cup 2026 schedule.
alter table public.matches
  add column if not exists venue_city text;

update public.matches set venue_city = case venue
  when 'Arrowhead Stadium' then 'Kansas City'
  when 'AT&T Stadium' then 'Dallas'
  when 'BC Place' then 'Vancouver'
  when 'BMO Field' then 'Toronto'
  when 'Estadio Akron' then 'Guadalajara'
  when 'Estadio Azteca' then 'Mexico City'
  when 'Estadio BBVA' then 'Monterrey'
  when 'Gillette Stadium' then 'Boston'
  when 'Hard Rock Stadium' then 'Miami'
  when 'Levi''s Stadium' then 'San Francisco Bay Area'
  when 'Lincoln Financial Field' then 'Philadelphia'
  when 'Lumen Field' then 'Seattle'
  when 'Mercedes-Benz Stadium' then 'Atlanta'
  when 'MetLife Stadium' then 'New York New Jersey'
  when 'NRG Stadium' then 'Houston'
  when 'SoFi Stadium' then 'Los Angeles'
  else null
end;
