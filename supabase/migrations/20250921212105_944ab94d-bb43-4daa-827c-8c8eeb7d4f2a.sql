-- Fix security issue: Email Addresses Could Be Harvested by Unauthorized Users
-- The issue is that current RLS policies on invitations table could allow cross-team access

-- First, add proper foreign key constraints to ensure data integrity
ALTER TABLE public.invitations 
  ADD CONSTRAINT fk_invitations_team_id 
  FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;

ALTER TABLE public.invitations 
  ADD CONSTRAINT fk_invitations_invited_by 
  FOREIGN KEY (invited_by) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Drop the existing problematic RLS policies
DROP POLICY IF EXISTS "Coaches can view invitations for their team" ON public.invitations;
DROP POLICY IF EXISTS "Users can view invitations sent to their email" ON public.invitations;
DROP POLICY IF EXISTS "Coaches can create invitations for their team" ON public.invitations;
DROP POLICY IF EXISTS "Coaches can update invitations for their team" ON public.invitations;
DROP POLICY IF EXISTS "Users can update invitations sent to their email" ON public.invitations;

-- Create new, more secure RLS policies
-- Policy for coaches to view invitations: Only for their team
CREATE POLICY "Coaches can view team invitations" ON public.invitations
FOR SELECT USING (
  team_id = public.get_user_team(auth.uid()) 
  AND public.get_user_role(auth.uid()) = ANY(ARRAY['head_coach'::public.user_role, 'assistant_coach'::public.user_role])
);

-- Policy for invited users to view their own invitations: Only their email
CREATE POLICY "Users can view own invitations" ON public.invitations
FOR SELECT USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
  AND status = 'pending'
  AND expires_at > NOW()
);

-- Policy for coaches to create invitations: Only for their team
CREATE POLICY "Coaches can create team invitations" ON public.invitations
FOR INSERT WITH CHECK (
  team_id = public.get_user_team(auth.uid())
  AND public.get_user_role(auth.uid()) = ANY(ARRAY['head_coach'::public.user_role, 'assistant_coach'::public.user_role])
  AND invited_by = auth.uid()
);

-- Policy for coaches to update invitations: Only for their team
CREATE POLICY "Coaches can update team invitations" ON public.invitations
FOR UPDATE USING (
  team_id = public.get_user_team(auth.uid())
  AND public.get_user_role(auth.uid()) = ANY(ARRAY['head_coach'::public.user_role, 'assistant_coach'::public.user_role])
);

-- Policy for invited users to update their own invitations (accept/decline)
CREATE POLICY "Users can update own invitations" ON public.invitations
FOR UPDATE USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
  AND status = 'pending'
  AND expires_at > NOW()
) WITH CHECK (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
  AND status IN ('accepted', 'declined')
);

-- Add index for better performance on email lookups
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_team_id ON public.invitations(team_id);
CREATE INDEX IF NOT EXISTS idx_invitations_status_expires ON public.invitations(status, expires_at);