-- ============================================================================
-- HUXZAIN Support Ticketing, Knowledge Base & Domain Configuration Migration
-- Date: 2026-06-09
-- ============================================================================

-- SECTION 1: PROFILE EXTENSIONS
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS marketing_emails_consent BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS push_notifications_consent BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS in_app_notifications_consent BOOLEAN DEFAULT true;

-- SECTION 2: SMTP CONFIGURATION
CREATE TABLE IF NOT EXISTS public.smtp_configurations (
  id INTEGER PRIMARY KEY DEFAULT 1,
  provider TEXT NOT NULL DEFAULT 'resend' CHECK (provider IN ('resend', 'sendgrid', 'ses', 'mailgun', 'postmark', 'custom')),
  api_key TEXT,
  from_email TEXT DEFAULT 'noreply@huxzain.shop',
  reply_to TEXT,
  smtp_host TEXT,
  smtp_port INTEGER,
  smtp_user TEXT,
  smtp_pass TEXT,
  domain_verification_status TEXT DEFAULT 'pending',
  spf_status TEXT DEFAULT 'pending',
  dkim_status TEXT DEFAULT 'pending',
  dmarc_status TEXT DEFAULT 'pending',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.smtp_configurations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS smtp_configurations_staff ON public.smtp_configurations;
CREATE POLICY smtp_configurations_staff ON public.smtp_configurations
  FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

INSERT INTO public.smtp_configurations (id, provider, from_email)
VALUES (1, 'resend', 'noreply@huxzain.shop')
ON CONFLICT (id) DO NOTHING;

-- SECTION 3: SUPPORT TICKETS (CREATE OR ALTER)
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure all columns are present
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'other';
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical', 'emergency'));
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'general' CHECK (department IN ('general', 'verification', 'finance', 'moderation', 'dispute', 'technical', 'seller_support', 'buyer_support', 'fraud_investigation', 'management'));
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open' CHECK (status IN ('open', 'pending', 'waiting_for_user', 'waiting_for_staff', 'escalated', 'resolved', 'closed'));
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS resolution TEXT;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating >= 1 AND rating <= 5);
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS feedback TEXT;

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS support_tickets_staff ON public.support_tickets;
CREATE POLICY support_tickets_staff ON public.support_tickets
  FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS support_tickets_user_read ON public.support_tickets;
CREATE POLICY support_tickets_user_read ON public.support_tickets
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS support_tickets_user_insert ON public.support_tickets;
CREATE POLICY support_tickets_user_insert ON public.support_tickets
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS support_tickets_user_update ON public.support_tickets;
CREATE POLICY support_tickets_user_update ON public.support_tickets
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- SECTION 4: SUPPORT TICKET MESSAGES (CREATE OR ALTER)
CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure all columns are present
ALTER TABLE public.support_ticket_messages ADD COLUMN IF NOT EXISTS sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.support_ticket_messages ADD COLUMN IF NOT EXISTS message TEXT NOT NULL DEFAULT '';
ALTER TABLE public.support_ticket_messages ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT false;
ALTER TABLE public.support_ticket_messages ADD COLUMN IF NOT EXISTS system_event BOOLEAN DEFAULT false;
ALTER TABLE public.support_ticket_messages ADD COLUMN IF NOT EXISTS attachments TEXT[] DEFAULT '{}'::TEXT[];

ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS support_messages_staff ON public.support_ticket_messages;
CREATE POLICY support_messages_staff ON public.support_ticket_messages
  FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS support_messages_user_read ON public.support_ticket_messages;
CREATE POLICY support_messages_user_read ON public.support_ticket_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id AND t.user_id = auth.uid()
    )
    AND is_internal = false
  );

DROP POLICY IF EXISTS support_messages_user_insert ON public.support_ticket_messages;
CREATE POLICY support_messages_user_insert ON public.support_ticket_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id AND t.user_id = auth.uid()
    )
    AND sender_id = auth.uid()
    AND is_internal = false
  );

-- SECTION 5: KNOWLEDGE BASE ARTICLES
CREATE TABLE IF NOT EXISTS public.kb_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_published BOOLEAN DEFAULT true,
  featured BOOLEAN DEFAULT false,
  views_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.kb_articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kb_articles_staff ON public.kb_articles;
CREATE POLICY kb_articles_staff ON public.kb_articles
  FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS kb_articles_public_read ON public.kb_articles;
CREATE POLICY kb_articles_public_read ON public.kb_articles
  FOR SELECT USING (is_published = true);

-- SECTION 6: STAFF ACTIONS NOTES COLUMN
ALTER TABLE public.staff_action_logs ADD COLUMN IF NOT EXISTS notes TEXT;

-- SECTION 7: INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_department ON public.support_tickets(department);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON public.support_ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_kb_articles_published ON public.kb_articles(is_published) WHERE is_published = true;
