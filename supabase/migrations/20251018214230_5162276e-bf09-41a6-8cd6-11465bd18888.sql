-- Fix ambiguous column reference in create_team_invitation
CREATE OR REPLACE FUNCTION public.create_team_invitation(p_email text, p_team_id uuid, p_invited_by uuid)
 RETURNS TABLE(invitation_token text, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_token TEXT;
  new_expires_at TIMESTAMPTZ;
  token_exists BOOLEAN;
BEGIN
  -- Generate a unique token (retry if collision occurs, though extremely unlikely)
  LOOP
    new_token := encode(extensions.gen_random_bytes(32), 'hex');
    
    -- Check if token already exists (use table alias to avoid ambiguity)
    SELECT EXISTS(
      SELECT 1 FROM public.invitations i WHERE i.invitation_token = new_token
    ) INTO token_exists;
    
    EXIT WHEN NOT token_exists;
  END LOOP;
  
  new_expires_at := NOW() + INTERVAL '7 days';
  
  -- Insert invitation with unique token
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
$function$;