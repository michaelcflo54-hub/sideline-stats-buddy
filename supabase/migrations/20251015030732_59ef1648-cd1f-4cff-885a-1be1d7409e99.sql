-- Remove the overly restrictive policy that blocks all SELECT queries
DROP POLICY IF EXISTS "No direct profile access" ON public.profiles;

-- Add a policy that allows users to view their own profile data
-- This is necessary for INSERT...RETURNING queries and general profile access
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (user_id = auth.uid());