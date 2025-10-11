-- Add new roles for construction site
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'owner';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'customer';

-- Estimates table for public quotation requests
CREATE TABLE IF NOT EXISTS public.estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  address TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;

-- Allow anyone (including anonymous site visitors) to submit an estimate
CREATE POLICY IF NOT EXISTS "Anyone can create estimate" ON public.estimates
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Only the owner can view all estimates
CREATE POLICY IF NOT EXISTS "Owner can view estimates" ON public.estimates
  FOR SELECT TO authenticated
  USING (public.get_user_role(auth.uid()) = 'owner');

-- Helper to fetch the current user's email
CREATE OR REPLACE FUNCTION public.get_my_email()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM public.profiles WHERE user_id = auth.uid();
$$;

-- Customer updates table for project-specific updates
CREATE TABLE IF NOT EXISTS public.customer_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_email TEXT NOT NULL,
  title TEXT,
  message TEXT,
  image_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(user_id)
);

ALTER TABLE public.customer_updates ENABLE ROW LEVEL SECURITY;

-- Owner can manage all customer updates
CREATE POLICY IF NOT EXISTS "Owner manage customer updates" ON public.customer_updates
  FOR ALL TO authenticated
  USING (public.get_user_role(auth.uid()) = 'owner')
  WITH CHECK (public.get_user_role(auth.uid()) = 'owner');

-- Customers can view their own updates by email
CREATE POLICY IF NOT EXISTS "Customer view own updates" ON public.customer_updates
  FOR SELECT TO authenticated
  USING (customer_email = public.get_my_email());

-- Storage buckets for images
INSERT INTO storage.buckets (id, name, public)
VALUES ('gallery', 'gallery', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('customer-updates', 'customer-updates', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access to gallery images
CREATE POLICY IF NOT EXISTS "Public read gallery" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'gallery');

-- Owner can upload to gallery
CREATE POLICY IF NOT EXISTS "Owner upload gallery" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'gallery' AND public.get_user_role(auth.uid()) = 'owner');

-- Public read of customer update images (can tighten later)
CREATE POLICY IF NOT EXISTS "Public read customer-updates" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'customer-updates');

-- Owner can upload to customer-updates bucket
CREATE POLICY IF NOT EXISTS "Owner upload customer-updates" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'customer-updates' AND public.get_user_role(auth.uid()) = 'owner');
