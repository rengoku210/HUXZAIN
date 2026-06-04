CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL,
  department TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.team_login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id TEXT,
  email TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  device TEXT,
  role_attempted TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_login_history ENABLE ROW LEVEL SECURITY;

-- Deny all public select/insert/update/delete operations.
-- Server functions using the Supabase Service Role client bypass RLS.
DROP POLICY IF EXISTS employees_deny_all ON public.employees;
CREATE POLICY employees_deny_all ON public.employees FOR ALL USING (false);

DROP POLICY IF EXISTS team_login_history_deny_all ON public.team_login_history;
CREATE POLICY team_login_history_deny_all ON public.team_login_history FOR ALL USING (false);
