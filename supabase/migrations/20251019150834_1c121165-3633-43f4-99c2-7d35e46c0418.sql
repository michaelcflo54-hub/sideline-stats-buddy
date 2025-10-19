-- Critical Security Fix: Implement Secure Role Management System
-- This migration addresses the privilege escalation vulnerability by moving roles to a separate table

-- Step 1: Create enum for roles (if not exists, reuse existing user_role)
-- The user_role enum already exists, so we'll use it

-- Step 2: Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role user_role NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Step 3: Create SECURITY DEFINER function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Step 4: Create function to get user's primary role (for backward compatibility)
CREATE OR REPLACE FUNCTION public.get_user_role_secure(_user_id uuid)
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role
      WHEN 'head_coach' THEN 1
      WHEN 'assistant_coach' THEN 2
      WHEN 'parent' THEN 3
    END
  LIMIT 1
$$;

-- Step 5: Migrate existing role data from profiles to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, role
FROM public.profiles
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 6: Create controlled RPC function for role assignment (replaces direct updates)
CREATE OR REPLACE FUNCTION public.assign_team_member_role_secure(p_user_id uuid, p_new_role user_role)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requester_team uuid;
  target_team uuid;
BEGIN
  -- Get the requester's team
  SELECT team_id INTO requester_team
  FROM public.profiles
  WHERE user_id = auth.uid();
  
  -- Only head coaches and assistant coaches can assign roles
  IF NOT (public.has_role(auth.uid(), 'head_coach') OR public.has_role(auth.uid(), 'assistant_coach')) THEN
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
  IF public.has_role(auth.uid(), 'head_coach') OR 
     (public.has_role(auth.uid(), 'assistant_coach') AND p_new_role = 'parent') THEN
    
    -- Remove all existing roles for this user
    DELETE FROM public.user_roles WHERE user_id = p_user_id;
    
    -- Insert new role
    INSERT INTO public.user_roles (user_id, role, assigned_by)
    VALUES (p_user_id, p_new_role, auth.uid());
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Step 7: Update all RLS policies to use has_role() function

-- Update games table policies
DROP POLICY IF EXISTS "Coaches can manage games" ON public.games;
CREATE POLICY "Coaches can manage games"
ON public.games
FOR ALL
USING (
  team_id = get_user_team(auth.uid())
  AND (public.has_role(auth.uid(), 'head_coach') OR public.has_role(auth.uid(), 'assistant_coach'))
);

-- Update invitations table policies (also addresses email exposure vulnerability)
DROP POLICY IF EXISTS "Authenticated coaches can view team invitations" ON public.invitations;
CREATE POLICY "Authenticated coaches can view team invitations"
ON public.invitations
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND team_id = get_user_team(auth.uid())
  AND (public.has_role(auth.uid(), 'head_coach') OR public.has_role(auth.uid(), 'assistant_coach'))
  AND invited_by = auth.uid()
);

DROP POLICY IF EXISTS "Authenticated coaches can create team invitations" ON public.invitations;
CREATE POLICY "Authenticated coaches can create team invitations"
ON public.invitations
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND team_id = get_user_team(auth.uid())
  AND (public.has_role(auth.uid(), 'head_coach') OR public.has_role(auth.uid(), 'assistant_coach'))
  AND invited_by = auth.uid()
);

DROP POLICY IF EXISTS "Authenticated coaches can update team invitations" ON public.invitations;
CREATE POLICY "Authenticated coaches can update team invitations"
ON public.invitations
FOR UPDATE
USING (
  auth.uid() IS NOT NULL
  AND team_id = get_user_team(auth.uid())
  AND (public.has_role(auth.uid(), 'head_coach') OR public.has_role(auth.uid(), 'assistant_coach'))
);

DROP POLICY IF EXISTS "Authenticated coaches can delete team invitations" ON public.invitations;
CREATE POLICY "Authenticated coaches can delete team invitations"
ON public.invitations
FOR DELETE
USING (
  auth.uid() IS NOT NULL
  AND team_id = get_user_team(auth.uid())
  AND (public.has_role(auth.uid(), 'head_coach') OR public.has_role(auth.uid(), 'assistant_coach'))
);

-- Tighten invitation SELECT policy to prevent email harvesting
DROP POLICY IF EXISTS "Authenticated users can view invitations by token" ON public.invitations;
CREATE POLICY "Authenticated users can view own invitations by email"
ON public.invitations
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
  AND status = 'pending'
  AND expires_at > now()
);

-- Update player_stats policies
DROP POLICY IF EXISTS "Coaches can manage player stats" ON public.player_stats;
CREATE POLICY "Coaches can manage player stats"
ON public.player_stats
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM players
    WHERE players.id = player_stats.player_id
      AND players.team_id = get_user_team(auth.uid())
      AND (public.has_role(auth.uid(), 'head_coach') OR public.has_role(auth.uid(), 'assistant_coach'))
  )
);

-- Update players policies
DROP POLICY IF EXISTS "Coaches can manage players" ON public.players;
CREATE POLICY "Coaches can manage players"
ON public.players
FOR ALL
USING (
  team_id = get_user_team(auth.uid())
  AND (public.has_role(auth.uid(), 'head_coach') OR public.has_role(auth.uid(), 'assistant_coach'))
);

-- Update plays policies
DROP POLICY IF EXISTS "Coaches can manage plays" ON public.plays;
CREATE POLICY "Coaches can manage plays"
ON public.plays
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM games
    WHERE games.id = plays.game_id
      AND games.team_id = get_user_team(auth.uid())
      AND (public.has_role(auth.uid(), 'head_coach') OR public.has_role(auth.uid(), 'assistant_coach'))
  )
);

-- Update profiles policies - prevent team data leak
DROP POLICY IF EXISTS "Authenticated users can view own profile" ON public.profiles;
CREATE POLICY "Authenticated users can view own profile"
ON public.profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND user_id = auth.uid()
);

DROP POLICY IF EXISTS "Authenticated users can update own profile" ON public.profiles;
CREATE POLICY "Authenticated users can update own profile"
ON public.profiles
FOR UPDATE
USING (
  auth.uid() IS NOT NULL
  AND user_id = auth.uid()
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND user_id = auth.uid()
  -- CRITICAL: Prevent users from updating their own role
  AND role = (SELECT role FROM public.profiles WHERE user_id = auth.uid())
);

-- Step 8: Update teams policies
DROP POLICY IF EXISTS "Head coaches can update their own team" ON public.teams;
CREATE POLICY "Head coaches can update their own team"
ON public.teams
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
      AND profiles.team_id = teams.id
      AND public.has_role(auth.uid(), 'head_coach')
  )
);

-- Step 9: Update helper functions to use new role system
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
  
  -- Check if user is already a coach using new role system
  IF public.has_role(auth.uid(), 'head_coach') OR public.has_role(auth.uid(), 'assistant_coach') THEN
    RETURN TRUE;
  END IF;
  
  -- Count existing coaches in the system
  SELECT COUNT(DISTINCT user_id) INTO existing_coaches_count
  FROM public.user_roles
  WHERE role IN ('head_coach', 'assistant_coach');
  
  -- Only allow if there are NO coaches yet (initial bootstrap)
  IF existing_coaches_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (auth.uid(), 'head_coach')
    ON CONFLICT (user_id, role) DO NOTHING;
    RETURN TRUE;
  ELSE
    -- If coaches exist, reject self-promotion
    RETURN FALSE;
  END IF;
END;
$$;

-- Step 10: Update handle_new_user trigger to use user_roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_value user_role;
BEGIN
  -- Extract role from metadata, default to 'parent'
  user_role_value := COALESCE((NEW.raw_user_meta_data ->> 'role')::public.user_role, 'parent');
  
  -- Insert profile (without role column)
  INSERT INTO public.profiles (user_id, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', '')
  );
  
  -- Insert role in user_roles table
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role_value)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Step 11: Create RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (user_id = auth.uid());

-- Only allow role insertion/updates through the secure RPC function
CREATE POLICY "No direct role modifications"
ON public.user_roles
FOR ALL
USING (false);

-- Step 12: Update other functions to use new role system
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
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.user_id,
    p.team_id,
    p.first_name,
    p.last_name,
    u.email,
    public.get_user_role_secure(p.user_id) as role,
    p.created_at,
    p.updated_at
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.user_id
  WHERE p.user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_team_member_profiles()
RETURNS TABLE(
  user_id uuid,
  first_name text,
  last_name text,
  role user_role,
  team_id uuid,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.user_id,
    p.first_name,
    p.last_name,
    public.get_user_role_secure(p.user_id) as role,
    p.team_id,
    p.created_at,
    p.updated_at
  FROM public.profiles p
  WHERE p.team_id = public.get_user_team(auth.uid());
$$;