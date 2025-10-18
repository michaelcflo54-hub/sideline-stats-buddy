-- Remove email from profiles table to prevent exposure
-- Email should only be accessed from auth.users through security definer functions

-- First, update the get_my_full_profile function to join with auth.users for email
CREATE OR REPLACE FUNCTION public.get_my_full_profile()
 RETURNS TABLE(
   id uuid, 
   user_id uuid, 
   team_id uuid, 
   first_name text, 
   last_name text, 
   email text, 
   role user_role, 
   created_at timestamp with time zone, 
   updated_at timestamp with time zone
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    p.id,
    p.user_id,
    p.team_id,
    p.first_name,
    p.last_name,
    u.email,
    p.role,
    p.created_at,
    p.updated_at
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.user_id
  WHERE p.user_id = auth.uid();
$function$;

-- Update the handle_new_user trigger to not insert email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, last_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::public.user_role, 'parent')
  );
  RETURN NEW;
END;
$function$;

-- Now drop the email column from profiles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email;