-- Check current policies on teams table
SELECT policyname, cmd, with_check 
FROM pg_policies 
WHERE tablename = 'teams' AND schemaname = 'public';

-- Also check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'teams' AND schemaname = 'public';