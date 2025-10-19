-- Ensure RLS is explicitly enabled on invitations table
-- This protects invitation tokens, email addresses, and team membership data

-- Enable RLS on invitations table (if not already enabled)
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them with explicit authentication checks
DROP POLICY IF EXISTS "Users can view invitations by token only" ON public.invitations;
DROP POLICY IF EXISTS "Coaches can view invitation status only" ON public.invitations;
DROP POLICY IF EXISTS "Users can update own invitations" ON public.invitations;
DROP POLICY IF EXISTS "Coaches can update team invitations" ON public.invitations;
DROP POLICY IF EXISTS "Coaches can create team invitations" ON public.invitations;
DROP POLICY IF EXISTS "Coaches can delete team invitations" ON public.invitations;

-- SELECT policies with explicit auth checks
-- Policy 1: Authenticated users can view invitations by token (for accepting invitations)
CREATE POLICY "Authenticated users can view invitations by token"
ON public.invitations
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND invitation_token IS NOT NULL
  AND email = (SELECT email FROM auth.users WHERE id = auth.uid())
  AND status = 'pending'
  AND expires_at > NOW()
);

-- Policy 2: Authenticated coaches can view their team's invitations
CREATE POLICY "Authenticated coaches can view team invitations"
ON public.invitations
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND team_id = get_user_team(auth.uid())
  AND get_user_role(auth.uid()) = ANY(ARRAY['head_coach'::user_role, 'assistant_coach'::user_role])
  AND invited_by = auth.uid()
);

-- INSERT policy: Only authenticated coaches can create invitations
CREATE POLICY "Authenticated coaches can create team invitations"
ON public.invitations
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND team_id = get_user_team(auth.uid())
  AND get_user_role(auth.uid()) = ANY(ARRAY['head_coach'::user_role, 'assistant_coach'::user_role])
  AND invited_by = auth.uid()
);

-- UPDATE policy 1: Authenticated users can update their own invitations (to accept/decline)
CREATE POLICY "Authenticated users can update own invitations"
ON public.invitations
FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND email = (SELECT email FROM auth.users WHERE id = auth.uid())
  AND status = 'pending'
  AND expires_at > NOW()
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND email = (SELECT email FROM auth.users WHERE id = auth.uid())
  AND status = ANY(ARRAY['accepted'::text, 'declined'::text])
);

-- UPDATE policy 2: Authenticated coaches can update their team's invitations
CREATE POLICY "Authenticated coaches can update team invitations"
ON public.invitations
FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND team_id = get_user_team(auth.uid())
  AND get_user_role(auth.uid()) = ANY(ARRAY['head_coach'::user_role, 'assistant_coach'::user_role])
);

-- DELETE policy: Only authenticated coaches can delete their team's invitations
CREATE POLICY "Authenticated coaches can delete team invitations"
ON public.invitations
FOR DELETE
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND team_id = get_user_team(auth.uid())
  AND get_user_role(auth.uid()) = ANY(ARRAY['head_coach'::user_role, 'assistant_coach'::user_role])
);