CREATE TABLE IF NOT EXISTS public.otps (
  email TEXT PRIMARY KEY,
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.otps ENABLE ROW LEVEL SECURITY;

-- Deny all public select/insert/update/delete operations on this table.
-- Server functions using the Supabase Service Role client bypass RLS.
DROP POLICY IF EXISTS otps_deny_all ON public.otps;
CREATE POLICY otps_deny_all ON public.otps FOR ALL USING (false);
