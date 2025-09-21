-- Fix privacy vulnerability: Restrict profile visibility to coaches only
DROP POLICY IF EXISTS "Users can view profiles in their team" ON public.profiles;

-- Create a more secure policy that only allows coaches to view team member profiles
-- Users can still view their own profile through the existing "Users can view their own profile" policy
CREATE POLICY "Coaches can view profiles in their team" 
ON public.profiles 
FOR SELECT 
USING (
  (team_id = get_user_team(auth.uid())) 
  AND 
  (get_user_role(auth.uid()) = ANY (ARRAY['head_coach'::user_role, 'assistant_coach'::user_role]))
);