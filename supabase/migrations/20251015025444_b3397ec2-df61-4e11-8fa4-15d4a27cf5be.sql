-- Remove the overly permissive RLS policy that allows public access to team data
-- The application already uses the secure can_join_team_by_code() function
-- which validates team codes without exposing team data

DROP POLICY IF EXISTS "Users can validate team codes only" ON public.teams;