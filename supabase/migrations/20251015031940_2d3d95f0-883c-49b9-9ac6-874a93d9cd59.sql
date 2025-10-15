-- Remove the insecure policy that allows users to update their own role
DROP POLICY IF EXISTS "Users can update their own role" ON public.profiles;

-- Create a secure function for initial coach registration
-- This allows the FIRST user to become a coach (for initial setup)
-- After that, only existing coaches can assign roles
CREATE OR REPLACE FUNCTION public.request_coach_role()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_profile RECORD;
  existing_coaches_count INTEGER;
BEGIN
  -- Get the current user's profile
  SELECT * INTO user_profile
  FROM public.profiles
  WHERE user_id = auth.uid();
  
  IF user_profile.id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user is already a coach
  IF user_profile.role IN ('head_coach', 'assistant_coach') THEN
    RETURN TRUE;
  END IF;
  
  -- Count existing coaches in the system
  SELECT COUNT(*) INTO existing_coaches_count
  FROM public.profiles
  WHERE role IN ('head_coach', 'assistant_coach');
  
  -- Only allow if there are NO coaches yet (initial bootstrap)
  IF existing_coaches_count = 0 THEN
    UPDATE public.profiles
    SET role = 'head_coach', updated_at = NOW()
    WHERE user_id = auth.uid();
    RETURN TRUE;
  ELSE
    -- If coaches exist, reject self-promotion
    RETURN FALSE;
  END IF;
END;
$$;

-- Create a function for coaches to assign roles to their team members
CREATE OR REPLACE FUNCTION public.assign_team_member_role(
  p_user_id uuid,
  p_new_role user_role
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requester_role user_role;
  requester_team uuid;
  target_team uuid;
BEGIN
  -- Get the requester's role and team
  SELECT role, team_id INTO requester_role, requester_team
  FROM public.profiles
  WHERE user_id = auth.uid();
  
  -- Only head coaches and assistant coaches can assign roles
  IF requester_role NOT IN ('head_coach', 'assistant_coach') THEN
    RETURN FALSE;
  END IF;
  
  -- Get the target user's team
  SELECT team_id INTO target_team
  FROM public.profiles
  WHERE user_id = p_user_id;
  
  -- Can only assign roles to members of the same team
  IF requester_team IS NULL OR target_team IS NULL OR requester_team != target_team THEN
    RETURN FALSE;
  END IF;
  
  -- Head coaches can assign any role
  -- Assistant coaches can only assign 'parent' role (cannot elevate to coach)
  IF requester_role = 'head_coach' OR 
     (requester_role = 'assistant_coach' AND p_new_role = 'parent') THEN
    UPDATE public.profiles
    SET role = p_new_role, updated_at = NOW()
    WHERE user_id = p_user_id;
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Add comments documenting the security model
COMMENT ON FUNCTION public.request_coach_role() IS 
'Allows the first user to become a head coach for initial system bootstrap. After the first coach exists, this function will reject all requests, preventing privilege escalation.';

COMMENT ON FUNCTION public.assign_team_member_role(uuid, user_role) IS 
'Allows coaches to assign roles to members of their own team. Head coaches can assign any role. Assistant coaches can only demote users to parent role.';