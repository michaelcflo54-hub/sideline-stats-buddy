-- Add DELETE policy for invitations table to allow coaches to remove invitations
-- This enables legitimate cleanup of expired, declined, or mistakenly sent invitations

CREATE POLICY "Coaches can delete team invitations" 
ON public.invitations 
FOR DELETE 
USING (
  team_id = get_user_team(auth.uid()) 
  AND get_user_role(auth.uid()) = ANY(ARRAY['head_coach'::user_role, 'assistant_coach'::user_role])
);