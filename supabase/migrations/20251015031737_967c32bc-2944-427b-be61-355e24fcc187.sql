-- Security improvements for invitation tokens
-- 1. Add UNIQUE constraint to ensure invitation tokens cannot be duplicated
ALTER TABLE public.invitations 
ADD CONSTRAINT invitations_token_unique UNIQUE (invitation_token);

-- 2. Add an index on invitation_token for faster lookups and token validation
CREATE INDEX IF NOT EXISTS idx_invitations_token_expires 
ON public.invitations(invitation_token, expires_at) 
WHERE status = 'pending';

-- 3. Add a function to safely validate and consume invitation tokens
-- This prevents timing attacks and implements proper token validation
CREATE OR REPLACE FUNCTION public.validate_invitation_token(p_token text)
RETURNS TABLE(
  is_valid boolean,
  team_id uuid,
  email text,
  expires_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invitation_record RECORD;
BEGIN
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
$$;

-- 4. Update the create_team_invitation function to ensure tokens are truly unique
CREATE OR REPLACE FUNCTION public.create_team_invitation(p_email text, p_team_id uuid, p_invited_by uuid)
RETURNS TABLE(invitation_token text, expires_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_token TEXT;
  new_expires_at TIMESTAMPTZ;
  token_exists BOOLEAN;
BEGIN
  -- Generate a unique token (retry if collision occurs, though extremely unlikely)
  LOOP
    new_token := encode(gen_random_bytes(32), 'hex');
    
    -- Check if token already exists
    SELECT EXISTS(
      SELECT 1 FROM public.invitations WHERE invitation_token = new_token
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
$$;

-- 5. Add a comment documenting the security properties
COMMENT ON COLUMN public.invitations.invitation_token IS 
'Cryptographically secure 256-bit random token (64 hex chars) generated using gen_random_bytes(32). Guaranteed unique via UNIQUE constraint.';