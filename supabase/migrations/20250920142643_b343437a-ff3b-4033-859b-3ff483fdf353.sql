-- Temporarily allow anyone to create teams for debugging
DROP POLICY IF EXISTS "Coaches can create teams" ON public.teams;

CREATE POLICY "Anyone can create teams temporarily" ON public.teams
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Let's also check what profiles exist
SELECT user_id, first_name, last_name, email, role, team_id, created_at 
FROM public.profiles 
ORDER BY created_at DESC 
LIMIT 5;