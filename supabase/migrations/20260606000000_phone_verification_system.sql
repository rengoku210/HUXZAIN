-- Phone Verification System migration
CREATE TABLE IF NOT EXISTS public.phone_otp_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  otp_hash text NOT NULL,  -- SHA-256 hash of OTP
  purpose text NOT NULL,   -- 'phone_verify', 'login', 'reset', 'phone_change'
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'verified', 'expired', 'failed'
  attempts integer NOT NULL DEFAULT 0,
  resend_count integer NOT NULL DEFAULT 0,
  last_sent_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  verified_at timestamptz,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add phone_verified_at column to public.profiles if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz;

-- Enable Row Level Security (RLS)
ALTER TABLE public.phone_otp_logs ENABLE ROW LEVEL SECURITY;

-- Deny all client direct operations (only server/service role bypasses)
DROP POLICY IF EXISTS phone_otp_logs_deny_all ON public.phone_otp_logs;
CREATE POLICY phone_otp_logs_deny_all ON public.phone_otp_logs FOR ALL USING (false);
