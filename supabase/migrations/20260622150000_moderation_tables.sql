-- 1. Create moderation_actions table
CREATE TABLE IF NOT EXISTS public.moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('warning', 'strike', 'mute', 'suspend', 'permanent_ban', 'unban')),
  reason TEXT NOT NULL,
  notes TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;

-- Create policies for moderation_actions
DROP POLICY IF EXISTS "Admins read all moderation actions" ON public.moderation_actions;
CREATE POLICY "Admins read all moderation actions" ON public.moderation_actions 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = ANY (ARRAY['admin', 'super_admin', 'owner', 'moderator', 'senior_moderator'])
    )
  );

DROP POLICY IF EXISTS "Users read own moderation actions" ON public.moderation_actions;
CREATE POLICY "Users read own moderation actions" ON public.moderation_actions
  FOR SELECT USING (target_user_id = auth.uid());

DROP POLICY IF EXISTS "Admins insert moderation actions" ON public.moderation_actions;
CREATE POLICY "Admins insert moderation actions" ON public.moderation_actions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = ANY (ARRAY['admin', 'super_admin', 'owner', 'moderator', 'senior_moderator'])
    )
  );

-- 2. Create user_moderation_status table
CREATE TABLE IF NOT EXISTS public.user_moderation_status (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  strike_count INTEGER NOT NULL DEFAULT 0,
  is_muted BOOLEAN NOT NULL DEFAULT FALSE,
  is_suspended BOOLEAN NOT NULL DEFAULT FALSE,
  is_banned BOOLEAN NOT NULL DEFAULT FALSE,
  suspension_expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_moderation_status ENABLE ROW LEVEL SECURITY;

-- Create policies for user_moderation_status
DROP POLICY IF EXISTS "Anyone read moderation status" ON public.user_moderation_status;
CREATE POLICY "Anyone read moderation status" ON public.user_moderation_status
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins write moderation status" ON public.user_moderation_status;
CREATE POLICY "Admins write moderation status" ON public.user_moderation_status
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = ANY (ARRAY['admin', 'super_admin', 'owner', 'moderator', 'senior_moderator'])
    )
  );

-- Add Users read own strikes RLS policy to existing user_strikes table if it exists
DROP POLICY IF EXISTS "Users read own strikes" ON public.user_strikes;
CREATE POLICY "Users read own strikes" ON public.user_strikes
  FOR SELECT USING (user_id = auth.uid());


-- 3. Trigger: Bi-directional sync between user_moderation_status and profiles
-- Sync user_moderation_status updates to profiles
CREATE OR REPLACE FUNCTION public.sync_user_moderation_status_to_profile()
RETURNS trigger AS $$
BEGIN
  -- Prevent loop recursion
  IF (TG_OP = 'UPDATE' AND 
      OLD.strike_count IS NOT DISTINCT FROM NEW.strike_count AND
      OLD.is_muted IS NOT DISTINCT FROM NEW.is_muted AND
      OLD.is_suspended IS NOT DISTINCT FROM NEW.is_suspended AND
      OLD.is_banned IS NOT DISTINCT FROM NEW.is_banned AND
      OLD.suspension_expires_at IS NOT DISTINCT FROM NEW.suspension_expires_at) THEN
    RETURN NEW;
  END IF;

  UPDATE public.profiles
  SET 
    strikes_count = COALESCE(NEW.strike_count, 0),
    suspended_at = CASE WHEN NEW.is_suspended THEN COALESCE(suspended_at, now()) ELSE NULL END,
    banned_at = CASE WHEN NEW.is_banned THEN COALESCE(banned_at, now()) ELSE NULL END,
    restricted_until = NEW.suspension_expires_at
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_user_moderation_status_to_profile ON public.user_moderation_status;
CREATE TRIGGER trg_sync_user_moderation_status_to_profile
AFTER INSERT OR UPDATE ON public.user_moderation_status
FOR EACH ROW EXECUTE FUNCTION public.sync_user_moderation_status_to_profile();


-- Sync profiles updates back to user_moderation_status
CREATE OR REPLACE FUNCTION public.sync_profile_to_user_moderation_status()
RETURNS trigger AS $$
BEGIN
  -- Prevent loop recursion
  IF (TG_OP = 'UPDATE' AND 
      OLD.strikes_count IS NOT DISTINCT FROM NEW.strikes_count AND
      OLD.suspended_at IS NOT DISTINCT FROM NEW.suspended_at AND
      OLD.banned_at IS NOT DISTINCT FROM NEW.banned_at AND
      OLD.restricted_until IS NOT DISTINCT FROM NEW.restricted_until) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.user_moderation_status (
    user_id, strike_count, is_muted, is_suspended, is_banned, suspension_expires_at, updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.strikes_count, 0),
    false, -- default mute
    (NEW.suspended_at IS NOT NULL),
    (NEW.banned_at IS NOT NULL),
    NEW.restricted_until,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    strike_count = COALESCE(EXCLUDED.strike_count, 0),
    is_suspended = EXCLUDED.is_suspended,
    is_banned = EXCLUDED.is_banned,
    suspension_expires_at = EXCLUDED.suspension_expires_at,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_profile_to_user_moderation_status ON public.profiles;
CREATE TRIGGER trg_sync_profile_to_user_moderation_status
AFTER INSERT OR UPDATE OF strikes_count, suspended_at, banned_at, restricted_until ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_to_user_moderation_status();


-- 4. Initial seed from profiles table to user_moderation_status
INSERT INTO public.user_moderation_status (user_id, strike_count, is_suspended, is_banned, suspension_expires_at, updated_at)
SELECT 
  id, 
  COALESCE(strikes_count, 0), 
  (suspended_at IS NOT NULL), 
  (banned_at IS NOT NULL), 
  restricted_until,
  now()
FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;


-- 5. Trigger: Sync user_moderation_status (banned/suspended) to auth.users.banned_until
CREATE OR REPLACE FUNCTION public.sync_moderation_to_auth_users()
RETURNS trigger AS $$
BEGIN
  UPDATE auth.users
  SET banned_until = CASE 
    WHEN NEW.is_banned THEN '3000-01-01 00:00:00+00'::timestamptz
    WHEN NEW.is_suspended THEN COALESCE(NEW.suspension_expires_at, now() + interval '30 days')
    ELSE NULL 
  END
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_moderation_to_auth_users ON public.user_moderation_status;
CREATE TRIGGER trg_sync_moderation_to_auth_users
AFTER INSERT OR UPDATE OF is_banned, is_suspended, suspension_expires_at ON public.user_moderation_status
FOR EACH ROW EXECUTE FUNCTION public.sync_moderation_to_auth_users();


-- 6. Trigger: Process moderation_actions and apply automatic strike rules (Strike 1, 2, 3, 5)
CREATE OR REPLACE FUNCTION public.process_moderation_action()
RETURNS trigger AS $$
DECLARE
  v_current_strikes integer;
  v_new_strikes integer;
  v_suspension_expires timestamptz;
BEGIN
  -- Fetch current strikes
  SELECT COALESCE(strike_count, 0) INTO v_current_strikes
  FROM public.user_moderation_status
  WHERE user_id = NEW.target_user_id;

  IF NOT FOUND THEN
    v_current_strikes := 0;
    INSERT INTO public.user_moderation_status (user_id, strike_count, is_muted, is_suspended, is_banned, updated_at)
    VALUES (NEW.target_user_id, 0, FALSE, FALSE, FALSE, now());
  END IF;

  CASE NEW.action_type
    WHEN 'warning' THEN
      UPDATE public.user_moderation_status SET updated_at = now() WHERE user_id = NEW.target_user_id;

    WHEN 'strike' THEN
      v_new_strikes := v_current_strikes + 1;
      
      IF v_new_strikes = 1 THEN
        -- Strike 1: Warning notification
        UPDATE public.user_moderation_status
        SET strike_count = v_new_strikes, updated_at = now()
        WHERE user_id = NEW.target_user_id;
      ELSIF v_new_strikes = 2 THEN
        -- Strike 2: Strong warning notification
        UPDATE public.user_moderation_status
        SET strike_count = v_new_strikes, updated_at = now()
        WHERE user_id = NEW.target_user_id;
      ELSIF v_new_strikes = 3 THEN
        -- Strike 3: Auto-suspension 30 days
        v_suspension_expires := now() + interval '30 days';
        NEW.expires_at := v_suspension_expires;
        
        UPDATE public.user_moderation_status
        SET 
          strike_count = v_new_strikes,
          is_suspended = true,
          suspension_expires_at = v_suspension_expires,
          updated_at = now()
        WHERE user_id = NEW.target_user_id;

        -- Log linked suspension log
        INSERT INTO public.moderation_actions (target_user_id, admin_id, action_type, reason, expires_at, created_at)
        VALUES (NEW.target_user_id, NEW.admin_id, 'suspend', 'Auto-suspended: 3 Strikes accumulated (30 days restriction)', v_suspension_expires, now());

      ELSIF v_new_strikes >= 5 THEN
        -- Strike 5: Permanent ban review required. Auto-ban user.
        UPDATE public.user_moderation_status
        SET 
          strike_count = v_new_strikes,
          is_banned = true,
          updated_at = now()
        WHERE user_id = NEW.target_user_id;

        INSERT INTO public.moderation_actions (target_user_id, admin_id, action_type, reason, expires_at, created_at)
        VALUES (NEW.target_user_id, NEW.admin_id, 'permanent_ban', 'Auto-banned: 5 Strikes accumulated (Permanent restriction)', NULL, now());
      ELSE
        -- Other strikes
        UPDATE public.user_moderation_status
        SET strike_count = v_new_strikes, updated_at = now()
        WHERE user_id = NEW.target_user_id;
      END IF;

    WHEN 'mute' THEN
      UPDATE public.user_moderation_status
      SET is_muted = true, updated_at = now()
      WHERE user_id = NEW.target_user_id;

    WHEN 'suspend' THEN
      UPDATE public.user_moderation_status
      SET 
        is_suspended = true,
        suspension_expires_at = COALESCE(NEW.expires_at, now() + interval '30 days'),
        updated_at = now()
      WHERE user_id = NEW.target_user_id;

    WHEN 'permanent_ban' THEN
      UPDATE public.user_moderation_status
      SET is_banned = true, updated_at = now()
      WHERE user_id = NEW.target_user_id;

    WHEN 'unban' THEN
      UPDATE public.user_moderation_status
      SET 
        is_banned = false,
        is_suspended = false,
        is_muted = false,
        strike_count = 0,
        suspension_expires_at = NULL,
        updated_at = now()
      WHERE user_id = NEW.target_user_id;
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_process_moderation_action ON public.moderation_actions;
CREATE TRIGGER trg_process_moderation_action
BEFORE INSERT ON public.moderation_actions
FOR EACH ROW EXECUTE FUNCTION public.process_moderation_action();


-- 7. Trigger: Check user moderation status BEFORE protected actions
CREATE OR REPLACE FUNCTION public.check_user_moderation_enforcement()
RETURNS trigger AS $$
DECLARE
  v_is_banned boolean;
  v_is_suspended boolean;
  v_is_muted boolean;
  v_expires_at timestamptz;
  v_reason text;
  v_user_id uuid;
BEGIN
  -- Determine user_id to validate depending on target table
  IF TG_TABLE_NAME = 'messages' THEN
    v_user_id := NEW.sender_id;
  ELSIF TG_TABLE_NAME = 'conversations' THEN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
      v_user_id := NEW.buyer_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'listings' THEN
    v_user_id := NEW.seller_id;
  ELSIF TG_TABLE_NAME = 'orders' THEN
    v_user_id := NEW.buyer_id;
  ELSIF TG_TABLE_NAME = 'withdrawals' THEN
    v_user_id := NEW.user_id;
  ELSIF TG_TABLE_NAME = 'reviews' THEN
    v_user_id := NEW.buyer_id;
  ELSIF TG_TABLE_NAME = 'disputes' THEN
    v_user_id := NEW.opened_by;
  ELSE
    v_user_id := auth.uid();
  END IF;

  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Fetch user status
  SELECT is_banned, is_suspended, is_muted, suspension_expires_at
  INTO v_is_banned, v_is_suspended, v_is_muted, v_expires_at
  FROM public.user_moderation_status
  WHERE user_id = v_user_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- 1. Ban Check
  IF v_is_banned THEN
    RAISE EXCEPTION 'USER_BANNED: Account permanently restricted.';
  END IF;

  -- 2. Suspension Check
  IF v_is_suspended THEN
    IF v_expires_at IS NOT NULL AND v_expires_at <= now() THEN
      -- Automatically lift expired suspension
      UPDATE public.user_moderation_status
      SET is_suspended = false, suspension_expires_at = NULL
      WHERE user_id = v_user_id;
    ELSE
      RAISE EXCEPTION 'USER_SUSPENDED: Account suspended until %.', v_expires_at;
    END IF;
  END IF;

  -- 3. Mute Check (Messaging and Chat creations)
  IF TG_TABLE_NAME IN ('messages', 'conversations') AND v_is_muted THEN
    SELECT expires_at, reason INTO v_expires_at, v_reason
    FROM public.moderation_actions
    WHERE target_user_id = v_user_id AND action_type = 'mute' AND (expires_at IS NULL OR expires_at > now())
    ORDER BY created_at DESC LIMIT 1;

    IF FOUND THEN
      RAISE EXCEPTION 'USER_MUTED: You are muted. Reason: %.', v_reason;
    ELSE
      UPDATE public.user_moderation_status SET is_muted = false WHERE user_id = v_user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply write blocker triggers to all targeted tables
DROP TRIGGER IF EXISTS trg_block_banned_listings ON public.listings;
CREATE TRIGGER trg_block_banned_listings
BEFORE INSERT OR UPDATE ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.check_user_moderation_enforcement();

DROP TRIGGER IF EXISTS trg_block_banned_orders ON public.orders;
CREATE TRIGGER trg_block_banned_orders
BEFORE INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.check_user_moderation_enforcement();

DROP TRIGGER IF EXISTS trg_block_banned_messages ON public.messages;
CREATE TRIGGER trg_block_banned_messages
BEFORE INSERT OR UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.check_user_moderation_enforcement();

DROP TRIGGER IF EXISTS trg_block_banned_conversations ON public.conversations;
CREATE TRIGGER trg_block_banned_conversations
BEFORE INSERT OR UPDATE ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.check_user_moderation_enforcement();

DROP TRIGGER IF EXISTS trg_block_banned_withdrawals ON public.withdrawals;
CREATE TRIGGER trg_block_banned_withdrawals
BEFORE INSERT OR UPDATE ON public.withdrawals
FOR EACH ROW EXECUTE FUNCTION public.check_user_moderation_enforcement();

DROP TRIGGER IF EXISTS trg_block_banned_reviews ON public.reviews;
CREATE TRIGGER trg_block_banned_reviews
BEFORE INSERT OR UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.check_user_moderation_enforcement();

DROP TRIGGER IF EXISTS trg_block_banned_disputes ON public.disputes;
CREATE TRIGGER trg_block_banned_disputes
BEFORE INSERT OR UPDATE ON public.disputes
FOR EACH ROW EXECUTE FUNCTION public.check_user_moderation_enforcement();
