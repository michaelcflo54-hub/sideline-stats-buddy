-- Drop all existing policies on teams table to start fresh
DROP POLICY IF EXISTS "Anyone can create teams temporarily" ON public.teams;
DROP POLICY IF EXISTS "Coaches can create teams" ON public.teams;
DROP POLICY IF EXISTS "Users can view their team" ON public.teams;
DROP POLICY IF EXISTS "Coaches can update their team" ON public.teams;

-- Create simple policies that will work
CREATE POLICY "Allow authenticated users to create teams" ON public.teams
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view all teams" ON public.teams
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can update all teams" ON public.teams
  FOR UPDATE TO authenticated
  USING (true);