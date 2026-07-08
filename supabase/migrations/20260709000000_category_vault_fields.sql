-- Migration: Category-Specific Vault Fields
-- Date: 2026-07-09
-- Extends listing_credentials with per-category encrypted fields for all 9 vault types.
-- All sensitive fields use pgp_sym_encrypt-backed BYTEA columns.
-- The reveal RPC is also extended to return the new fields.

-- ─────────────────────────────────────────
-- 1. Add new encrypted BYTEA columns
-- ─────────────────────────────────────────
ALTER TABLE public.listing_credentials
  -- Shared / general
  ADD COLUMN IF NOT EXISTS activation_key_enc      BYTEA,   -- Gift Cards: card code; Software: product key; In-game: redemption code
  ADD COLUMN IF NOT EXISTS pin_enc                 BYTEA,   -- Gift Cards: PIN
  ADD COLUMN IF NOT EXISTS download_url_enc        BYTEA,   -- Digital Products / Software: download link
  ADD COLUMN IF NOT EXISTS download_password_enc   BYTEA,   -- Digital Products / Software: archive password
  -- Subscriptions
  ADD COLUMN IF NOT EXISTS assigned_profile        TEXT,    -- non-sensitive: profile name/number
  ADD COLUMN IF NOT EXISTS plan_type               TEXT,    -- non-sensitive: Premium 4K, Standard, etc.
  ADD COLUMN IF NOT EXISTS expiry_date             TEXT,    -- non-sensitive: expiry info
  ADD COLUMN IF NOT EXISTS devices_allowed         TEXT,    -- non-sensitive: number of screens
  ADD COLUMN IF NOT EXISTS region_info             TEXT,    -- non-sensitive: region
  ADD COLUMN IF NOT EXISTS usage_guidelines        TEXT,    -- non-sensitive: usage rules text
  ADD COLUMN IF NOT EXISTS seller_note             TEXT,    -- non-sensitive: seller-supplied note
  -- Hosting & Web Services
  ADD COLUMN IF NOT EXISTS control_panel_url_enc   BYTEA,   -- encrypted: hosting control panel URL
  ADD COLUMN IF NOT EXISTS service_details         TEXT,    -- non-sensitive: plan, domain, billing cycle
  -- Digital Products
  ADD COLUMN IF NOT EXISTS product_info            TEXT,    -- non-sensitive: version, compatibility, file type info
  ADD COLUMN IF NOT EXISTS documentation_urls      TEXT,    -- non-sensitive: JSON array of {name, url}
  -- AI Tools / Software extra
  ADD COLUMN IF NOT EXISTS setup_guide             TEXT,    -- non-sensitive: step-by-step setup guide
  ADD COLUMN IF NOT EXISTS additional_resources    TEXT,    -- non-sensitive: extra resources text / JSON
  ADD COLUMN IF NOT EXISTS account_info            TEXT,    -- non-sensitive: plan validity, notes
  -- In-game currency / top-up
  ADD COLUMN IF NOT EXISTS topup_uid_enc           BYTEA,   -- encrypted: player UID for topup destination
  ADD COLUMN IF NOT EXISTS topup_region            TEXT,    -- non-sensitive
  ADD COLUMN IF NOT EXISTS topup_player_name       TEXT,    -- non-sensitive
  ADD COLUMN IF NOT EXISTS topup_amount            TEXT,    -- non-sensitive: e.g. "5600 VP"
  ADD COLUMN IF NOT EXISTS topup_game              TEXT,    -- non-sensitive: game name
  -- Gaming Accounts extra
  ADD COLUMN IF NOT EXISTS backup_codes_enc        BYTEA,   -- encrypted: 2FA/backup codes
  ADD COLUMN IF NOT EXISTS transfer_instructions   TEXT;    -- non-sensitive: transfer guide text

-- ─────────────────────────────────────────
-- 2. Extended reveal RPC
-- Returns all fields. Enforces access + logs.
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.reveal_listing_credentials_v2(p_listing_id UUID)
RETURNS TABLE (
  -- original fields
  login_id                TEXT,
  password                TEXT,
  instructions            TEXT,
  recovery_details        TEXT,
  email_transfer_details  TEXT,
  -- new fields (encrypted)
  activation_key          TEXT,
  pin                     TEXT,
  download_url            TEXT,
  download_password       TEXT,
  control_panel_url       TEXT,
  backup_codes            TEXT,
  topup_uid               TEXT,
  -- non-sensitive (returned as-is)
  assigned_profile        TEXT,
  plan_type               TEXT,
  expiry_date             TEXT,
  devices_allowed         TEXT,
  region_info             TEXT,
  usage_guidelines        TEXT,
  seller_note             TEXT,
  service_details         TEXT,
  product_info            TEXT,
  documentation_urls      TEXT,
  setup_guide             TEXT,
  additional_resources    TEXT,
  account_info            TEXT,
  topup_region            TEXT,
  topup_player_name       TEXT,
  topup_amount            TEXT,
  topup_game              TEXT,
  transfer_instructions   TEXT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE k TEXT := public._credential_key();
BEGIN
  IF NOT public._can_access_credentials(p_listing_id) THEN
    RAISE EXCEPTION 'not authorized to reveal credentials for this listing';
  END IF;

  -- Write access log
  INSERT INTO public.credential_access_log(listing_id, accessed_by, access_type)
  VALUES (p_listing_id, auth.uid(), 'reveal_v2');

  RETURN QUERY
    SELECT
      CASE WHEN lc.login_id_enc IS NOT NULL THEN pgp_sym_decrypt(lc.login_id_enc, k) ELSE NULL END,
      CASE WHEN lc.password_enc IS NOT NULL THEN pgp_sym_decrypt(lc.password_enc, k) ELSE NULL END,
      lc.instructions,
      CASE WHEN lc.recovery_details_enc IS NOT NULL THEN pgp_sym_decrypt(lc.recovery_details_enc, k) ELSE NULL END,
      CASE WHEN lc.email_transfer_details_enc IS NOT NULL THEN pgp_sym_decrypt(lc.email_transfer_details_enc, k) ELSE NULL END,
      CASE WHEN lc.activation_key_enc IS NOT NULL THEN pgp_sym_decrypt(lc.activation_key_enc, k) ELSE NULL END,
      CASE WHEN lc.pin_enc IS NOT NULL THEN pgp_sym_decrypt(lc.pin_enc, k) ELSE NULL END,
      CASE WHEN lc.download_url_enc IS NOT NULL THEN pgp_sym_decrypt(lc.download_url_enc, k) ELSE NULL END,
      CASE WHEN lc.download_password_enc IS NOT NULL THEN pgp_sym_decrypt(lc.download_password_enc, k) ELSE NULL END,
      CASE WHEN lc.control_panel_url_enc IS NOT NULL THEN pgp_sym_decrypt(lc.control_panel_url_enc, k) ELSE NULL END,
      CASE WHEN lc.backup_codes_enc IS NOT NULL THEN pgp_sym_decrypt(lc.backup_codes_enc, k) ELSE NULL END,
      CASE WHEN lc.topup_uid_enc IS NOT NULL THEN pgp_sym_decrypt(lc.topup_uid_enc, k) ELSE NULL END,
      lc.assigned_profile,
      lc.plan_type,
      lc.expiry_date,
      lc.devices_allowed,
      lc.region_info,
      lc.usage_guidelines,
      lc.seller_note,
      lc.service_details,
      lc.product_info,
      lc.documentation_urls,
      lc.setup_guide,
      lc.additional_resources,
      lc.account_info,
      lc.topup_region,
      lc.topup_player_name,
      lc.topup_amount,
      lc.topup_game,
      lc.transfer_instructions
    FROM public.listing_credentials lc
    WHERE lc.listing_id = p_listing_id;
END $$;

-- Grant execute permission
REVOKE ALL ON FUNCTION public.reveal_listing_credentials_v2(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reveal_listing_credentials_v2(UUID) TO authenticated;

-- ─────────────────────────────────────────
-- 3. Extended set credentials RPC
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_listing_credentials_v2(
  p_listing_id              UUID,
  p_login_id                TEXT DEFAULT NULL,
  p_password                TEXT DEFAULT NULL,
  p_instructions            TEXT DEFAULT NULL,
  p_recovery_details        TEXT DEFAULT NULL,
  p_email_transfer_details  TEXT DEFAULT NULL,
  p_activation_key          TEXT DEFAULT NULL,
  p_pin                     TEXT DEFAULT NULL,
  p_download_url            TEXT DEFAULT NULL,
  p_download_password       TEXT DEFAULT NULL,
  p_control_panel_url       TEXT DEFAULT NULL,
  p_backup_codes            TEXT DEFAULT NULL,
  p_topup_uid               TEXT DEFAULT NULL,
  -- non-sensitive
  p_assigned_profile        TEXT DEFAULT NULL,
  p_plan_type               TEXT DEFAULT NULL,
  p_expiry_date             TEXT DEFAULT NULL,
  p_devices_allowed         TEXT DEFAULT NULL,
  p_region_info             TEXT DEFAULT NULL,
  p_usage_guidelines        TEXT DEFAULT NULL,
  p_seller_note             TEXT DEFAULT NULL,
  p_service_details         TEXT DEFAULT NULL,
  p_product_info            TEXT DEFAULT NULL,
  p_documentation_urls      TEXT DEFAULT NULL,
  p_setup_guide             TEXT DEFAULT NULL,
  p_additional_resources    TEXT DEFAULT NULL,
  p_account_info            TEXT DEFAULT NULL,
  p_topup_region            TEXT DEFAULT NULL,
  p_topup_player_name       TEXT DEFAULT NULL,
  p_topup_amount            TEXT DEFAULT NULL,
  p_topup_game              TEXT DEFAULT NULL,
  p_transfer_instructions   TEXT DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE k TEXT := public._credential_key();
BEGIN
  IF NOT (auth.uid() = (SELECT seller_id FROM public.listings WHERE id = p_listing_id) OR public.is_staff()) THEN
    RAISE EXCEPTION 'not authorized to set credentials for this listing';
  END IF;

  INSERT INTO public.listing_credentials AS lc (
    listing_id,
    login_id_enc, password_enc, instructions,
    recovery_details_enc, email_transfer_details_enc,
    activation_key_enc, pin_enc, download_url_enc, download_password_enc,
    control_panel_url_enc, backup_codes_enc, topup_uid_enc,
    assigned_profile, plan_type, expiry_date, devices_allowed, region_info,
    usage_guidelines, seller_note, service_details, product_info,
    documentation_urls, setup_guide, additional_resources, account_info,
    topup_region, topup_player_name, topup_amount, topup_game,
    transfer_instructions, updated_at
  ) VALUES (
    p_listing_id,
    CASE WHEN p_login_id          IS NOT NULL THEN pgp_sym_encrypt(p_login_id, k) END,
    CASE WHEN p_password          IS NOT NULL THEN pgp_sym_encrypt(p_password, k) END,
    p_instructions,
    CASE WHEN p_recovery_details       IS NOT NULL THEN pgp_sym_encrypt(p_recovery_details, k) END,
    CASE WHEN p_email_transfer_details IS NOT NULL THEN pgp_sym_encrypt(p_email_transfer_details, k) END,
    CASE WHEN p_activation_key    IS NOT NULL THEN pgp_sym_encrypt(p_activation_key, k) END,
    CASE WHEN p_pin               IS NOT NULL THEN pgp_sym_encrypt(p_pin, k) END,
    CASE WHEN p_download_url      IS NOT NULL THEN pgp_sym_encrypt(p_download_url, k) END,
    CASE WHEN p_download_password IS NOT NULL THEN pgp_sym_encrypt(p_download_password, k) END,
    CASE WHEN p_control_panel_url IS NOT NULL THEN pgp_sym_encrypt(p_control_panel_url, k) END,
    CASE WHEN p_backup_codes      IS NOT NULL THEN pgp_sym_encrypt(p_backup_codes, k) END,
    CASE WHEN p_topup_uid         IS NOT NULL THEN pgp_sym_encrypt(p_topup_uid, k) END,
    p_assigned_profile, p_plan_type, p_expiry_date, p_devices_allowed, p_region_info,
    p_usage_guidelines, p_seller_note, p_service_details, p_product_info,
    p_documentation_urls, p_setup_guide, p_additional_resources, p_account_info,
    p_topup_region, p_topup_player_name, p_topup_amount, p_topup_game,
    p_transfer_instructions, now()
  )
  ON CONFLICT (listing_id) DO UPDATE SET
    login_id_enc            = COALESCE(EXCLUDED.login_id_enc, lc.login_id_enc),
    password_enc            = COALESCE(EXCLUDED.password_enc, lc.password_enc),
    instructions            = COALESCE(EXCLUDED.instructions, lc.instructions),
    recovery_details_enc    = COALESCE(EXCLUDED.recovery_details_enc, lc.recovery_details_enc),
    email_transfer_details_enc = COALESCE(EXCLUDED.email_transfer_details_enc, lc.email_transfer_details_enc),
    activation_key_enc      = COALESCE(EXCLUDED.activation_key_enc, lc.activation_key_enc),
    pin_enc                 = COALESCE(EXCLUDED.pin_enc, lc.pin_enc),
    download_url_enc        = COALESCE(EXCLUDED.download_url_enc, lc.download_url_enc),
    download_password_enc   = COALESCE(EXCLUDED.download_password_enc, lc.download_password_enc),
    control_panel_url_enc   = COALESCE(EXCLUDED.control_panel_url_enc, lc.control_panel_url_enc),
    backup_codes_enc        = COALESCE(EXCLUDED.backup_codes_enc, lc.backup_codes_enc),
    topup_uid_enc           = COALESCE(EXCLUDED.topup_uid_enc, lc.topup_uid_enc),
    assigned_profile        = COALESCE(EXCLUDED.assigned_profile, lc.assigned_profile),
    plan_type               = COALESCE(EXCLUDED.plan_type, lc.plan_type),
    expiry_date             = COALESCE(EXCLUDED.expiry_date, lc.expiry_date),
    devices_allowed         = COALESCE(EXCLUDED.devices_allowed, lc.devices_allowed),
    region_info             = COALESCE(EXCLUDED.region_info, lc.region_info),
    usage_guidelines        = COALESCE(EXCLUDED.usage_guidelines, lc.usage_guidelines),
    seller_note             = COALESCE(EXCLUDED.seller_note, lc.seller_note),
    service_details         = COALESCE(EXCLUDED.service_details, lc.service_details),
    product_info            = COALESCE(EXCLUDED.product_info, lc.product_info),
    documentation_urls      = COALESCE(EXCLUDED.documentation_urls, lc.documentation_urls),
    setup_guide             = COALESCE(EXCLUDED.setup_guide, lc.setup_guide),
    additional_resources    = COALESCE(EXCLUDED.additional_resources, lc.additional_resources),
    account_info            = COALESCE(EXCLUDED.account_info, lc.account_info),
    topup_region            = COALESCE(EXCLUDED.topup_region, lc.topup_region),
    topup_player_name       = COALESCE(EXCLUDED.topup_player_name, lc.topup_player_name),
    topup_amount            = COALESCE(EXCLUDED.topup_amount, lc.topup_amount),
    topup_game              = COALESCE(EXCLUDED.topup_game, lc.topup_game),
    transfer_instructions   = COALESCE(EXCLUDED.transfer_instructions, lc.transfer_instructions),
    updated_at              = now();
END $$;

REVOKE ALL ON FUNCTION public.set_listing_credentials_v2 FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_listing_credentials_v2 TO authenticated;
