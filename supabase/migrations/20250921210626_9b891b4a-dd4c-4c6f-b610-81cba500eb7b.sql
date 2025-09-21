-- Add foreign key constraints to invitations table
ALTER TABLE public.invitations 
ADD CONSTRAINT invitations_team_id_fkey 
FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;

ALTER TABLE public.invitations 
ADD CONSTRAINT invitations_invited_by_fkey 
FOREIGN KEY (invited_by) REFERENCES public.profiles(user_id) ON DELETE CASCADE;