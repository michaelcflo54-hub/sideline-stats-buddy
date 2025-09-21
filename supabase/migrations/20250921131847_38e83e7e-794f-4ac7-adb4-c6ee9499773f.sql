-- Fix security vulnerability: Restrict team updates to head coaches of their own team only
DROP POLICY IF EXISTS "Users can update all teams" ON public.teams;

-- Create a more secure policy that only allows head coaches to update their own team
CREATE POLICY "Head coaches can update their own team" 
ON public.teams 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.team_id = teams.id 
    AND profiles.role = 'head_coach'
  )
);