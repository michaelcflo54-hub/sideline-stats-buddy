-- Fix security definer view issue and complete the token-based security system

-- Drop the problematic security definer view
DROP VIEW IF EXISTS public.safe_invitation_summary;

-- Instead, create a secure function that returns invitation summary without exposing emails
CREATE OR REPLACE FUNCTION public.get_my_invitation_summary()
RETURNS TABLE(
  id UUID,
  status TEXT,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  team_name TEXT
) LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT 
    i.id,
    i.status,
    i.created_at,
    i.expires_at,
    t.name as team_name
  FROM public.invitations i
  JOIN public.teams t ON i.team_id = t.id
  WHERE i.team_id = public.get_user_team(auth.uid())
    AND public.get_user_role(auth.uid()) = ANY(ARRAY['head_coach'::public.user_role, 'assistant_coach'::public.user_role])
    AND i.invited_by = auth.uid();
$$;

-- Update the existing accept_invitation function to work with the original system as fallback
CREATE OR REPLACE FUNCTION public.accept_invitation(invitation_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invitation_record RECORD;
  user_email TEXT;
BEGIN
  -- Get current user's email
  SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();
  
  IF user_email IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Get invitation details and verify email matches
  SELECT * INTO invitation_record 
  FROM public.invitations 
  WHERE id = invitation_id 
    AND email = user_email
    AND status = 'pending' 
    AND expires_at > NOW();
  
  -- If invitation not found or expired, return false
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Update user's profile with team_id
  UPDATE public.profiles 
  SET team_id = invitation_record.team_id, updated_at = NOW()
  WHERE user_id = auth.uid();
  
  -- Mark invitation as accepted
  UPDATE public.invitations 
  SET status = 'accepted', updated_at = NOW()
  WHERE id = invitation_id;
  
  RETURN TRUE;
END;
$$;

-- Ensure all existing invitations have tokens
UPDATE public.invitations 
SET invitation_token = encode(gen_random_bytes(32), 'hex')
WHERE invitation_token IS NULL;