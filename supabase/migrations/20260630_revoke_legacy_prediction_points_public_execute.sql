-- Follow-up to 20260630_centralize_total_prediction_scoring.sql: that
-- migration already revoked execute on the deprecated public.prediction_points
-- from anon/authenticated directly, but a function also carries an implicit
-- PUBLIC grant from creation time — this closes that remaining path and makes
-- the intended scorers' grants explicit.

-- Ensure the deprecated legacy scorer is not callable through the default PUBLIC grant.
revoke execute on function public.prediction_points(
  integer, integer, text, text, text, integer, integer, text, text
) from public;

-- Make the intended scorers explicitly callable if needed by authenticated clients/RPCs.
grant execute on function public.prediction_points_v2(
  text, integer, integer, integer, integer, text,
  integer, integer, text, text, text
) to authenticated;

grant execute on function public.prediction_total_points(
  text, integer, integer, integer, integer, text,
  integer, integer, text, text, text, text, text
) to authenticated;
