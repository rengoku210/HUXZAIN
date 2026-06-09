-- ============================================================================
-- HUXZAIN Admin Scaling Subsystems Migration
-- Date: 2026-06-09
-- Description: Extends existing tables and creates 16+ new admin/platform tables
-- ============================================================================

-- ============================================================================
-- HELPER: is_admin() function (admin, super_admin, owner only)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role::text IN ('admin', 'super_admin', 'owner')
  );
$$;

-- ============================================================================
-- SECTION 1: PROFILE EXTENSIONS
-- ============================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS seller_tier TEXT DEFAULT 'bronze';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS warnings_count INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS strikes_count INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 100;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fraud_flags TEXT[] DEFAULT '{}';

-- ============================================================================
-- SECTION 2: ORDER EXTENSIONS
-- ============================================================================

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS timeline JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS investigation_notes TEXT;

-- ============================================================================
-- SECTION 3: DISPUTE EXTENSIONS
-- ============================================================================

ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS evidence_payload JSONB DEFAULT '[]'::jsonb;

-- ============================================================================
-- SECTION 4: LISTING EXTENSIONS
-- ============================================================================

ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS moderator_notes TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS risk_score INTEGER DEFAULT 0;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS suspicious_keywords TEXT[] DEFAULT '{}';

-- ============================================================================
-- SECTION 5: WITHDRAWALS TABLE (must exist before extensions/FK references)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  method TEXT NOT NULL DEFAULT 'bank_transfer',
  account_details JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processing', 'completed', 'rejected', 'cancelled')),
  processed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS withdrawals_read_own_or_staff ON public.withdrawals;
CREATE POLICY withdrawals_read_own_or_staff ON public.withdrawals
  FOR SELECT USING (user_id = auth.uid() OR public.is_staff());

DROP POLICY IF EXISTS withdrawals_insert_own ON public.withdrawals;
CREATE POLICY withdrawals_insert_own ON public.withdrawals
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS withdrawals_update_staff ON public.withdrawals;
CREATE POLICY withdrawals_update_staff ON public.withdrawals
  FOR UPDATE USING (public.is_staff()) WITH CHECK (public.is_staff());

-- WITHDRAWAL EXTENSIONS (now safe to add columns)
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS risk_flags TEXT[] DEFAULT '{}';

-- ============================================================================
-- SECTION 6: terms_acceptance_logs
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.terms_acceptance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  terms_version TEXT DEFAULT 'v1.0',
  page TEXT NOT NULL,
  accepted BOOLEAN DEFAULT true
);

ALTER TABLE public.terms_acceptance_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS terms_acceptance_select_own ON public.terms_acceptance_logs;
CREATE POLICY terms_acceptance_select_own ON public.terms_acceptance_logs
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS terms_acceptance_select_staff ON public.terms_acceptance_logs;
CREATE POLICY terms_acceptance_select_staff ON public.terms_acceptance_logs
  FOR SELECT USING (public.is_staff());

-- Server writes (service role) bypass RLS; no public insert policy needed.

-- ============================================================================
-- SECTION 7: user_activities
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  page_path TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  duration_seconds INTEGER DEFAULT 0,
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  event_type TEXT DEFAULT 'page_view' CHECK (event_type IN ('page_view', 'add_to_cart', 'purchase')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_activities_insert_public ON public.user_activities;
CREATE POLICY user_activities_insert_public ON public.user_activities
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS user_activities_select_staff ON public.user_activities;
CREATE POLICY user_activities_select_staff ON public.user_activities
  FOR SELECT USING (public.is_staff());

-- ============================================================================
-- SECTION 8: announcements
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'banner' CHECK (type IN ('banner', 'popup', 'both')),
  placement TEXT DEFAULT 'both' CHECK (placement IN ('homepage', 'dashboard', 'both')),
  audience TEXT DEFAULT 'all' CHECK (audience IN ('all', 'sellers', 'buyers')),
  starts_at TIMESTAMPTZ DEFAULT now(),
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS announcements_read_active ON public.announcements;
CREATE POLICY announcements_read_active ON public.announcements
  FOR SELECT USING (is_active = true OR public.is_staff());

DROP POLICY IF EXISTS announcements_staff_manage ON public.announcements;
CREATE POLICY announcements_staff_manage ON public.announcements
  FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

-- ============================================================================
-- SECTION 9: emergency_alerts
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.emergency_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  priority TEXT DEFAULT 'critical',
  show_popup BOOLEAN DEFAULT true,
  show_banner BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.emergency_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS emergency_alerts_read_active ON public.emergency_alerts;
CREATE POLICY emergency_alerts_read_active ON public.emergency_alerts
  FOR SELECT USING (is_active = true OR public.is_staff());

DROP POLICY IF EXISTS emergency_alerts_staff_manage ON public.emergency_alerts;
CREATE POLICY emergency_alerts_staff_manage ON public.emergency_alerts
  FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

-- ============================================================================
-- SECTION 10: email_templates
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS email_templates_staff_only ON public.email_templates;
CREATE POLICY email_templates_staff_only ON public.email_templates
  FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

-- ============================================================================
-- SECTION 11: campaigns
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  channel TEXT DEFAULT 'email' CHECK (channel IN ('email', 'notification', 'push', 'announcement')),
  audience_segment TEXT NOT NULL,
  template_id UUID REFERENCES public.email_templates(id) ON DELETE SET NULL,
  subject TEXT,
  body TEXT,
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled')),
  stats JSONB DEFAULT '{"total":0,"delivered":0,"failed":0,"opens":0,"clicks":0}'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS campaigns_staff_only ON public.campaigns;
CREATE POLICY campaigns_staff_only ON public.campaigns
  FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

-- ============================================================================
-- SECTION 12: staff_tasks
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.staff_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  department TEXT NOT NULL,
  due_date TIMESTAMPTZ,
  notes TEXT,
  attachments TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'overdue')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.staff_tasks ENABLE ROW LEVEL SECURITY;

-- Staff can read/manage their own assigned tasks
DROP POLICY IF EXISTS staff_tasks_select_staff ON public.staff_tasks;
CREATE POLICY staff_tasks_select_staff ON public.staff_tasks
  FOR SELECT USING (public.is_staff());

DROP POLICY IF EXISTS staff_tasks_insert_staff ON public.staff_tasks;
CREATE POLICY staff_tasks_insert_staff ON public.staff_tasks
  FOR INSERT WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS staff_tasks_update_own_or_admin ON public.staff_tasks;
CREATE POLICY staff_tasks_update_own_or_admin ON public.staff_tasks
  FOR UPDATE USING (
    assigned_to = auth.uid()
    OR created_by = auth.uid()
    OR public.is_admin()
  ) WITH CHECK (
    assigned_to = auth.uid()
    OR created_by = auth.uid()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS staff_tasks_delete_admin ON public.staff_tasks;
CREATE POLICY staff_tasks_delete_admin ON public.staff_tasks
  FOR DELETE USING (public.is_admin());

-- ============================================================================
-- SECTION 13: staff_task_history
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.staff_task_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.staff_tasks(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES auth.users(id),
  status_from TEXT,
  status_to TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_task_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS staff_task_history_read_staff ON public.staff_task_history;
CREATE POLICY staff_task_history_read_staff ON public.staff_task_history
  FOR SELECT USING (public.is_staff());

DROP POLICY IF EXISTS staff_task_history_insert_staff ON public.staff_task_history;
CREATE POLICY staff_task_history_insert_staff ON public.staff_task_history
  FOR INSERT WITH CHECK (public.is_staff());

-- ============================================================================
-- SECTION 14: internal_notifications
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.internal_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'warning', 'task', 'alert')),
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.internal_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS internal_notifications_read_own ON public.internal_notifications;
CREATE POLICY internal_notifications_read_own ON public.internal_notifications
  FOR SELECT USING (user_id = auth.uid() OR public.is_staff());

DROP POLICY IF EXISTS internal_notifications_update_own ON public.internal_notifications;
CREATE POLICY internal_notifications_update_own ON public.internal_notifications
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS internal_notifications_insert_staff ON public.internal_notifications;
CREATE POLICY internal_notifications_insert_staff ON public.internal_notifications
  FOR INSERT WITH CHECK (public.is_staff());

-- ============================================================================
-- SECTION 15: user_warnings
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  action_taken TEXT CHECK (action_taken IN ('warning', 'restriction', 'suspension', 'ban', 'strike_removal')),
  issued_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_warnings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_warnings_staff_only ON public.user_warnings;
CREATE POLICY user_warnings_staff_only ON public.user_warnings
  FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

-- ============================================================================
-- SECTION 16: flagged_chats
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.flagged_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID,
  buyer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  flag_reason TEXT NOT NULL,
  risk_level TEXT DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  risk_score INTEGER DEFAULT 0,
  flagged_messages JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'reviewed', 'resolved', 'ignored', 'escalated')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.flagged_chats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS flagged_chats_staff_only ON public.flagged_chats;
CREATE POLICY flagged_chats_staff_only ON public.flagged_chats
  FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

-- ============================================================================
-- SECTION 17: security_incidents
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.security_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  incident_type TEXT NOT NULL CHECK (incident_type IN (
    'failed_login', 'suspicious_location', 'verification_failure',
    'fraud_report', 'account_takeover', 'brute_force', 'ip_anomaly'
  )),
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.security_incidents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS security_incidents_staff_only ON public.security_incidents;
CREATE POLICY security_incidents_staff_only ON public.security_incidents
  FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

-- ============================================================================
-- SECTION 18: role_permissions
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.role_permissions (
  role TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS role_permissions_read_staff ON public.role_permissions;
CREATE POLICY role_permissions_read_staff ON public.role_permissions
  FOR SELECT USING (public.is_staff());

DROP POLICY IF EXISTS role_permissions_write_admin ON public.role_permissions;
CREATE POLICY role_permissions_write_admin ON public.role_permissions
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Seed default role permissions
INSERT INTO public.role_permissions (role, label, permissions) VALUES
  ('moderator', 'Moderator', '["view_reports","resolve_reports","view_flagged_chats","review_flagged_chats","view_listings","moderate_listings","view_users"]'::jsonb),
  ('payment_reviewer', 'Payment Reviewer', '["view_payments","approve_payments","reject_payments","view_withdrawals","process_withdrawals","view_transactions"]'::jsonb),
  ('verification_officer', 'Verification Officer', '["view_verifications","approve_verifications","reject_verifications","view_security_incidents","resolve_security_incidents"]'::jsonb),
  ('support_agent', 'Support Agent', '["view_tickets","respond_tickets","view_orders","view_disputes","view_users","send_notifications","view_flagged_chats"]'::jsonb),
  ('admin', 'Admin', '["all_read","manage_users","manage_listings","manage_orders","manage_disputes","manage_withdrawals","manage_staff_tasks","manage_campaigns","manage_announcements","manage_settings","view_analytics"]'::jsonb),
  ('super_admin', 'Super Admin', '["all_read","all_write","manage_roles","manage_employees","manage_platform_settings","manage_maintenance","view_security_incidents","resolve_security_incidents","manage_emergency_alerts"]'::jsonb)
ON CONFLICT (role) DO UPDATE SET
  label = EXCLUDED.label,
  permissions = EXCLUDED.permissions,
  updated_at = now();

-- ============================================================================
-- SECTION 19: withdrawal_logs
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.withdrawal_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  withdrawal_id UUID NOT NULL REFERENCES public.withdrawals(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  notes TEXT,
  employee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.withdrawal_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS withdrawal_logs_staff_only ON public.withdrawal_logs;
CREATE POLICY withdrawal_logs_staff_only ON public.withdrawal_logs
  FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

-- ============================================================================
-- SECTION 20: platform_health_snapshots
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.platform_health_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  open_disputes INTEGER DEFAULT 0,
  pending_verifications INTEGER DEFAULT 0,
  pending_withdrawals INTEGER DEFAULT 0,
  pending_tickets INTEGER DEFAULT 0,
  flagged_users INTEGER DEFAULT 0,
  flagged_chats INTEGER DEFAULT 0,
  high_risk_accounts INTEGER DEFAULT 0,
  critical_alerts INTEGER DEFAULT 0,
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_health_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_health_snapshots_staff_only ON public.platform_health_snapshots;
CREATE POLICY platform_health_snapshots_staff_only ON public.platform_health_snapshots
  FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

-- ============================================================================
-- SECTION 21: maintenance_mode
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.maintenance_mode (
  id INTEGER PRIMARY KEY DEFAULT 1,
  is_enabled BOOLEAN DEFAULT false,
  message TEXT DEFAULT 'Platform is under maintenance. We will be back soon.',
  expected_back_at TIMESTAMPTZ,
  allowed_roles TEXT[] DEFAULT '{admin,super_admin,owner}',
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.maintenance_mode ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS maintenance_mode_read_public ON public.maintenance_mode;
CREATE POLICY maintenance_mode_read_public ON public.maintenance_mode
  FOR SELECT USING (true);

DROP POLICY IF EXISTS maintenance_mode_write_admin ON public.maintenance_mode;
CREATE POLICY maintenance_mode_write_admin ON public.maintenance_mode
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Seed default maintenance_mode row
INSERT INTO public.maintenance_mode (id, is_enabled, message)
VALUES (1, false, 'Platform is under maintenance. We will be back soon.')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- INDEXES for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_terms_acceptance_user ON public.terms_acceptance_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_user ON public.user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_created ON public.user_activities(created_at);
CREATE INDEX IF NOT EXISTS idx_user_activities_event ON public.user_activities(event_type);
CREATE INDEX IF NOT EXISTS idx_announcements_active ON public.announcements(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_active ON public.emergency_alerts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_assigned ON public.staff_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_status ON public.staff_tasks(status);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_department ON public.staff_tasks(department);
CREATE INDEX IF NOT EXISTS idx_internal_notifications_user ON public.internal_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_internal_notifications_unread ON public.internal_notifications(user_id) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_warnings_user ON public.user_warnings(user_id);
CREATE INDEX IF NOT EXISTS idx_flagged_chats_status ON public.flagged_chats(status);
CREATE INDEX IF NOT EXISTS idx_security_incidents_user ON public.security_incidents(user_id);
CREATE INDEX IF NOT EXISTS idx_security_incidents_unresolved ON public.security_incidents(resolved) WHERE resolved = false;
CREATE INDEX IF NOT EXISTS idx_withdrawal_logs_withdrawal ON public.withdrawal_logs(withdrawal_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON public.withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON public.withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_platform_health_snapshot_at ON public.platform_health_snapshots(snapshot_at);

-- ============================================================================
-- Done. All tables, policies, indexes, and seed data created.
-- ============================================================================
