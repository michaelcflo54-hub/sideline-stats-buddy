-- Add explicit DELETE policy to profiles table to prevent unauthorized deletions
-- This makes it clear that profile deletion is not allowed, protecting user data integrity

CREATE POLICY "Profile deletion is not allowed"
ON public.profiles
FOR DELETE
TO authenticated
USING (false);