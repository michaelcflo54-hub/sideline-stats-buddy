-- Add RLS policy to allow assistant coaches to create teams
CREATE POLICY "Coaches can create teams" ON public.teams
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) IN ('head_coach', 'assistant_coach'));