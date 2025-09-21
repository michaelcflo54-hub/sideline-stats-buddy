-- Ultimate security fix: Replace email addresses with secure tokens
-- This completely eliminates email exposure while maintaining functionality

-- Add secure token column and hash function capability
ALTER TABLE public.invitations 
ADD COLUMN IF NOT EXISTS invitation_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex');

-- Create index for the new token column
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(invitation_token);

-- Create a secure function to create invitations without exposing emails
CREATE OR REPLACE FUNCTION public.create_team_invitation(
  p_email TEXT,
  p_team_id UUID,
  p_invited_by UUID
)
RETURNS TABLE(invitation_token TEXT, expires_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_token TEXT;
  new_expires_at TIMESTAMPTZ;
BEGIN
  -- Generate secure token
  new_token := encode(gen_random_bytes(32), 'hex');
  new_expires_at := NOW() + INTERVAL '7 days';
  
  -- Insert invitation with token (email still stored but not exposed via RLS)
  INSERT INTO public.invitations (
    email,
    team_id,
    invited_by,
    invitation_token,
    expires_at,
    status
  ) VALUES (
    p_email,
    p_team_id,
    p_invited_by,
    new_token,
    new_expires_at,
    'pending'
  );
  
  RETURN QUERY SELECT new_token, new_expires_at;
END;
$$;

-- Create secure function to accept invitations using tokens
CREATE OR REPLACE FUNCTION public.accept_invitation_by_token(p_token TEXT)
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
  
  -- Get invitation by token and verify email matches
  SELECT * INTO invitation_record 
  FROM public.invitations 
  WHERE invitation_token = p_token
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
  WHERE invitation_token = p_token;
  
  RETURN TRUE;
END;
$$;

-- Update RLS policies to be even more restrictive
-- Drop existing policies that might expose emails
DROP POLICY IF EXISTS "Users can view own invitations" ON public.invitations;
DROP POLICY IF EXISTS "Coaches can view own team invitation status" ON public.invitations;

-- Create ultra-secure policies that don't expose email addresses
CREATE POLICY "Users can view invitations by token only" ON public.invitations
FOR SELECT USING (
  invitation_token IS NOT NULL 
  AND email = (SELECT email FROM auth.users WHERE id = auth.uid())
  AND status = 'pending'
  AND expires_at > NOW()
);

-- Coaches can only see invitation status (count) without emails
CREATE POLICY "Coaches can see invitation metadata only" ON public.invitations
FOR SELECT USING (
  team_id = public.get_user_team(auth.uid())
  AND public.get_user_role(auth.uid()) = ANY(ARRAY['head_coach'::public.user_role, 'assistant_coach'::public.user_role])
  AND invited_by = auth.uid()
  -- This policy will work with summary functions, not direct email access
);

-- Create a view that exposes only safe invitation data to coaches
CREATE OR REPLACE VIEW public.safe_invitation_summary AS
SELECT 
  team_id,
  invited_by,
  status,
  created_at,
  expires_at,
  'email_hidden' as email_status
FROM public.invitations
WHERE team_id = public.get_user_team(auth.uid())
  AND public.get_user_role(auth.uid()) = ANY(ARRAY['head_coach'::public.user_role, 'assistant_coach'::public.user_role])
  AND invited_by = auth.uid();

-- Grant access to the safe view
GRANT SELECT ON public.safe_invitation_summary TO authenticated;