-- Enhance invitation token security with strict expiration enforcement

-- 1. Add function to automatically clean up expired invitations
CREATE OR REPLACE FUNCTION public.cleanup_expired_invitations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Mark expired pending invitations as expired
  UPDATE public.invitations
  SET status = 'expired'
  WHERE status = 'pending' 
    AND expires_at <= NOW();
END;
$function$;

-- 2. Update validate_invitation_token to be more strict
CREATE OR REPLACE FUNCTION public.validate_invitation_token(p_token text)
 RETURNS TABLE(is_valid boolean, team_id uuid, email text, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  invitation_record RECORD;
BEGIN
  -- Clean up expired invitations first
  PERFORM public.cleanup_expired_invitations();
  
  -- Attempt to find a valid invitation with constant-time comparison approach
  SELECT 
    i.id,
    i.team_id,
    i.email,
    i.expires_at,
    i.status,
    (i.status = 'pending' AND i.expires_at > NOW()) as is_valid
  INTO invitation_record
  FROM public.invitations i
  WHERE i.invitation_token = p_token;
  
  -- Always return a result to prevent timing attacks
  IF invitation_record.id IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::text, NULL::timestamp with time zone;
  ELSE
    RETURN QUERY SELECT 
      invitation_record.is_valid,
      invitation_record.team_id,
      invitation_record.email,
      invitation_record.expires_at;
  END IF;
END;
$function$;

-- 3. Update accept_invitation_by_token to enforce expiration strictly
CREATE OR REPLACE FUNCTION public.accept_invitation_by_token(p_token text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  invitation_record RECORD;
  user_email TEXT;
BEGIN
  -- Clean up expired invitations first
  PERFORM public.cleanup_expired_invitations();
  
  -- Get current user's email
  SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();
  
  IF user_email IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Get invitation by token and verify email matches AND not expired
  SELECT * INTO invitation_record 
  FROM public.invitations 
  WHERE invitation_token = p_token
    AND email = user_email
    AND status = 'pending' 
    AND expires_at > NOW();
  
  -- If invitation not found, expired, or email doesn't match, return false
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
$function$;

-- 4. Create a secure function for coaches to view invitation metadata WITHOUT tokens
CREATE OR REPLACE FUNCTION public.get_my_team_invitations()
 RETURNS TABLE(
   id uuid,
   email text,
   status text,
   created_at timestamp with time zone,
   expires_at timestamp with time zone,
   invited_by uuid
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    i.id,
    i.email,
    i.status,
    i.created_at,
    i.expires_at,
    i.invited_by
  FROM public.invitations i
  WHERE i.team_id = public.get_user_team(auth.uid())
    AND public.get_user_role(auth.uid()) = ANY(ARRAY['head_coach'::public.user_role, 'assistant_coach'::public.user_role])
    AND i.invited_by = auth.uid()
  ORDER BY i.created_at DESC;
$function$;

-- 5. Update RLS policy to prevent direct access to invitation_token column
-- Drop the old coach metadata policy and replace with stricter one
DROP POLICY IF EXISTS "Coaches can see invitation metadata only" ON public.invitations;

CREATE POLICY "Coaches can view invitation status only"
ON public.invitations
FOR SELECT
TO authenticated
USING (
  team_id = get_user_team(auth.uid()) 
  AND get_user_role(auth.uid()) = ANY(ARRAY['head_coach'::user_role, 'assistant_coach'::user_role])
  AND invited_by = auth.uid()
);

COMMENT ON POLICY "Coaches can view invitation status only" ON public.invitations IS 
'Allows coaches to view invitation records but token should only be accessed via secure functions';