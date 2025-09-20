-- Allow users to update their own role (but only between coach roles for security)
CREATE POLICY "Users can update their own role" ON public.profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid() AND 
    role IN ('head_coach', 'assistant_coach', 'parent')
  );