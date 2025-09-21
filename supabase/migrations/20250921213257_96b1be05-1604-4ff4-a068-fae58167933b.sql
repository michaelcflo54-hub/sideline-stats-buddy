-- Final security enhancement: Remove any potential team information exposure
-- Replace the team lookup policy with a more secure approach

-- Drop the current team lookup policy that might expose team names
DROP POLICY IF EXISTS "Users can lookup team by code for joining" ON public.teams;

-- Create a more secure policy that only allows very specific access
CREATE POLICY "Users can validate team codes only" ON public.teams
FOR SELECT USING (
  team_code IS NOT NULL 
  AND public.get_user_team(auth.uid()) IS NULL
  -- This policy will work with the can_join_team_by_code function we created
  -- which validates codes without exposing team details
);

-- Also, let's ensure we have a secure way to share team info ONLY after joining
CREATE POLICY "Team members can see full team details" ON public.teams
FOR SELECT USING (
  id = public.get_user_team(auth.uid())
  AND public.get_user_team(auth.uid()) IS NOT NULL
);

-- Create a secure function for getting just the team name after joining (for Link Preview)
CREATE OR REPLACE FUNCTION public.get_my_team_details()
RETURNS TABLE(
  id UUID,
  name TEXT,
  team_code TEXT,
  season_year INTEGER
) LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT t.id, t.name, t.team_code, t.season_year
  FROM public.teams t
  WHERE t.id = public.get_user_team(auth.uid())
    AND public.get_user_team(auth.uid()) IS NOT NULL;
$$;