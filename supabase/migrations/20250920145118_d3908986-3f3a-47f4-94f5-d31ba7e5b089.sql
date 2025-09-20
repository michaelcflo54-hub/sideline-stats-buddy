-- Re-enable RLS on teams table (it was disabled earlier for debugging)
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;