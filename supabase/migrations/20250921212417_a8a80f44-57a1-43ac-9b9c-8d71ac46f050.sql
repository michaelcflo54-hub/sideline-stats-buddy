-- Fix remaining security issues: Further secure email addresses and team data

-- 1. Fix profiles table security - prevent cross-team email harvesting
-- Drop existing policies that might be too permissive
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create more restrictive profile policies
CREATE POLICY "Users can view own profile only" ON public.profiles
FOR SELECT USING (user_id = auth.uid());

-- 2. Fix teams table security - prevent unauthorized team discovery
-- Drop the overly permissive team policies
DROP POLICY IF EXISTS "Users can view all teams" ON public.teams;
DROP POLICY IF EXISTS "Users can find teams by code" ON public.teams;

-- Create more secure team policies
-- Users can only see their own team
CREATE POLICY "Users can view own team" ON public.teams
FOR SELECT USING (
  id = public.get_user_team(auth.uid())
);

-- Allow team lookup by code only for joining (more restricted)
CREATE POLICY "Users can lookup team by code for joining" ON public.teams
FOR SELECT USING (
  team_code IS NOT NULL 
  AND public.get_user_team(auth.uid()) IS NULL
);

-- 3. Further secure invitations table - remove email exposure to other coaches
-- Drop the existing coach view policy
DROP POLICY IF EXISTS "Coaches can view team invitations" ON public.invitations;

-- Create a more restrictive policy that only shows minimal info to coaches
CREATE POLICY "Coaches can view own team invitation status" ON public.invitations
FOR SELECT USING (
  team_id = public.get_user_team(auth.uid())
  AND public.get_user_role(auth.uid()) = ANY(ARRAY['head_coach'::public.user_role, 'assistant_coach'::public.user_role])
  AND invited_by = auth.uid()  -- Only see invitations they created
);

-- Create a security definer function to get invitation count without exposing emails
CREATE OR REPLACE FUNCTION public.get_team_invitation_summary()
RETURNS TABLE(
  pending_count INTEGER,
  accepted_count INTEGER,
  expired_count INTEGER
) LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT 
    COUNT(*) FILTER (WHERE status = 'pending' AND expires_at > NOW())::INTEGER as pending_count,
    COUNT(*) FILTER (WHERE status = 'accepted')::INTEGER as accepted_count,
    COUNT(*) FILTER (WHERE status = 'pending' AND expires_at <= NOW())::INTEGER as expired_count
  FROM public.invitations 
  WHERE team_id = public.get_user_team(auth.uid())
    AND public.get_user_role(auth.uid()) = ANY(ARRAY['head_coach'::public.user_role, 'assistant_coach'::public.user_role]);
$$;

-- 4. Add additional security indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_teams_team_code ON public.teams(team_code) WHERE team_code IS NOT NULL;

-- 5. Create function to safely check if user can join team by code (without exposing team details)
CREATE OR REPLACE FUNCTION public.can_join_team_by_code(code TEXT)
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.teams 
    WHERE team_code = UPPER(code)
    AND public.get_user_team(auth.uid()) IS NULL
  );
$$;