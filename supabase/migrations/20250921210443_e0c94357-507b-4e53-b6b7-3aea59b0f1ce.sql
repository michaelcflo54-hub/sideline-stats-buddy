-- Create invitations table to track team invitations
CREATE TABLE public.invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL,
  email TEXT NOT NULL,
  invited_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(team_id, email)
);

-- Enable RLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Create policies for invitations
CREATE POLICY "Users can view invitations sent to their email" 
ON public.invitations 
FOR SELECT 
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Coaches can view invitations for their team" 
ON public.invitations 
FOR SELECT 
USING (team_id = get_user_team(auth.uid()) AND get_user_role(auth.uid()) IN ('head_coach', 'assistant_coach'));

CREATE POLICY "Coaches can create invitations for their team" 
ON public.invitations 
FOR INSERT 
WITH CHECK (team_id = get_user_team(auth.uid()) AND get_user_role(auth.uid()) IN ('head_coach', 'assistant_coach') AND invited_by = auth.uid());

CREATE POLICY "Users can update invitations sent to their email" 
ON public.invitations 
FOR UPDATE 
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Coaches can update invitations for their team" 
ON public.invitations 
FOR UPDATE 
USING (team_id = get_user_team(auth.uid()) AND get_user_role(auth.uid()) IN ('head_coach', 'assistant_coach'));

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_invitations_updated_at
BEFORE UPDATE ON public.invitations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to accept invitation
CREATE OR REPLACE FUNCTION public.accept_invitation(invitation_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  invitation_record RECORD;
BEGIN
  -- Get invitation details
  SELECT * INTO invitation_record 
  FROM public.invitations 
  WHERE id = invitation_id 
    AND email = (SELECT email FROM auth.users WHERE id = auth.uid())
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.accept_invitation(UUID) TO authenticated;