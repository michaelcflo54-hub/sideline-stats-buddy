-- Allow users to view their own profile regardless of team assignment
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());