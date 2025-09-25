-- Drop the existing SELECT policy that allows direct access to profiles
DROP POLICY IF EXISTS "Users can view own profile only" ON public.profiles;

-- Create a more restrictive policy that prevents direct SELECT access
-- Users should only access profiles through the secure RPC functions
CREATE POLICY "No direct profile access"
ON public.profiles
FOR SELECT
USING (false);

-- Update any remaining direct profile access in the application to use RPC functions
-- The get_my_full_profile() and get_my_public_profile() functions will handle secure access