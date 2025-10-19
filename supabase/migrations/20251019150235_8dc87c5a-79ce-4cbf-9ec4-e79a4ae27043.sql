-- Explicitly ensure RLS is enabled on invitations table
-- This addresses the scanner finding about missing RLS

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;