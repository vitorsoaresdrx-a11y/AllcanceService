
-- Add email column to tenant_members for display purposes
ALTER TABLE public.tenant_members ADD COLUMN IF NOT EXISTS email text;

-- Update existing owner's email from auth (we'll do this via edge function)
