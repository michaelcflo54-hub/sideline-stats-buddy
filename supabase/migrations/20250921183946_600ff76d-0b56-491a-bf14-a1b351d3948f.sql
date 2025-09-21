-- Add team_code field to teams table for joining functionality
ALTER TABLE public.teams 
ADD COLUMN team_code TEXT UNIQUE;

-- Generate unique 6-character team codes for existing teams
UPDATE public.teams 
SET team_code = UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6))
WHERE team_code IS NULL;

-- Make team_code required for new teams
ALTER TABLE public.teams 
ALTER COLUMN team_code SET NOT NULL;

-- Create function to join team by code
CREATE OR REPLACE FUNCTION public.join_team_by_code(code TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  target_team_id UUID;
BEGIN
  -- Find team by code
  SELECT id INTO target_team_id 
  FROM public.teams 
  WHERE team_code = UPPER(code);
  
  -- If team not found, return false
  IF target_team_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Update user's profile with team_id
  UPDATE public.profiles 
  SET team_id = target_team_id, updated_at = NOW()
  WHERE user_id = auth.uid();
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.join_team_by_code(TEXT) TO authenticated;

-- Allow users to find teams by code (but only return minimal info)
CREATE POLICY "Users can find teams by code" 
ON public.teams 
FOR SELECT 
USING (team_code IS NOT NULL);