-- Restrict direct access to profiles to self only by removing broad coach SELECT policy
DROP POLICY IF EXISTS "Coaches can view profiles in their team" ON public.profiles;

-- Create a secure function to return limited team member data (no emails)
CREATE OR REPLACE FUNCTION public.get_my_team_member_profiles()
RETURNS TABLE (
  user_id uuid,
  first_name text,
  last_name text,
  role public.user_role,
  team_id uuid,
  created_at timestamptz,
  updated_at timestamptz
) AS $$
  SELECT p.user_id, p.first_name, p.last_name, p.role, p.team_id, p.created_at, p.updated_at
  FROM public.profiles p
  WHERE p.team_id = public.get_user_team(auth.uid());
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Allow authenticated users to execute the function
GRANT EXECUTE ON FUNCTION public.get_my_team_member_profiles() TO authenticated;