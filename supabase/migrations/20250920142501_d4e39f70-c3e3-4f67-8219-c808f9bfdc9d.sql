-- Fix the team creation policy to work properly
DROP POLICY IF EXISTS "Coaches can create teams" ON public.teams;

-- Create a better policy that doesn't rely on the potentially failing get_user_role function
CREATE POLICY "Coaches can create teams" ON public.teams
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role IN ('head_coach', 'assistant_coach')
    )
  );