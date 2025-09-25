-- Create a function to get user's own profile (including email) - security definer
CREATE OR REPLACE FUNCTION public.get_my_full_profile()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  team_id uuid,
  first_name text,
  last_name text,
  email text,
  role user_role,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.user_id,
    p.team_id,
    p.first_name,
    p.last_name,
    p.email,
    p.role,
    p.created_at,
    p.updated_at
  FROM public.profiles p
  WHERE p.user_id = auth.uid();
$$;

-- Create a function to get public profile data (no email) - security definer
CREATE OR REPLACE FUNCTION public.get_my_public_profile()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  team_id uuid,
  first_name text,
  last_name text,
  role user_role,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.user_id,
    p.team_id,
    p.first_name,
    p.last_name,
    p.role,
    p.created_at,
    p.updated_at
  FROM public.profiles p
  WHERE p.user_id = auth.uid();
$$;

-- Update the existing team member profiles function to ensure it doesn't expose emails
CREATE OR REPLACE FUNCTION public.get_my_team_member_profiles()
 RETURNS TABLE(user_id uuid, first_name text, last_name text, role user_role, team_id uuid, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.user_id, p.first_name, p.last_name, p.role, p.team_id, p.created_at, p.updated_at
  FROM public.profiles p
  WHERE p.team_id = public.get_user_team(auth.uid());
$function$;