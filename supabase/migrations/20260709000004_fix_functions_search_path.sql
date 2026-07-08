-- Update credentials and vault functions to include the 'extensions' schema in search_path.
-- This ensures that pgcrypto functions (pgp_sym_encrypt/decrypt) are resolved correctly
-- on setups where the pgcrypto extension is installed in the 'extensions' schema.

-- ─────────────────────────────────────────
-- 1. reveal_listing_credentials_v2
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.reveal_listing_credentials_v2(p_listing_id UUID)
RETURNS TABLE (
  login_id                TEXT,
  password                TEXT,
  instructions            TEXT,
  recovery_details        TEXT,
  email_transfer_details  TEXT,
  activation_key          TEXT,
  pin                     TEXT,
  download_url            TEXT,
  download_password       TEXT,
  control_panel_url       TEXT,
  backup_codes            TEXT,
  topup_uid               TEXT,
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
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
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

-- ─────────────────────────────────────────
-- 2. set_listing_credentials_v2
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
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
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
    login_id_enc            = EXCLUDED.login_id_enc,
    password_enc            = EXCLUDED.password_enc,
    instructions            = EXCLUDED.instructions,
    recovery_details_enc    = EXCLUDED.recovery_details_enc,
    email_transfer_details_enc = EXCLUDED.email_transfer_details_enc,
    activation_key_enc      = EXCLUDED.activation_key_enc,
    pin_enc                 = EXCLUDED.pin_enc,
    download_url_enc        = EXCLUDED.download_url_enc,
    download_password_enc   = EXCLUDED.download_password_enc,
    control_panel_url_enc   = EXCLUDED.control_panel_url_enc,
    backup_codes_enc        = EXCLUDED.backup_codes_enc,
    topup_uid_enc           = EXCLUDED.topup_uid_enc,
    assigned_profile        = EXCLUDED.assigned_profile,
    plan_type               = EXCLUDED.plan_type,
    expiry_date             = EXCLUDED.expiry_date,
    devices_allowed         = EXCLUDED.devices_allowed,
    region_info             = EXCLUDED.region_info,
    usage_guidelines        = EXCLUDED.usage_guidelines,
    seller_note             = EXCLUDED.seller_note,
    service_details         = EXCLUDED.service_details,
    product_info            = EXCLUDED.product_info,
    documentation_urls      = EXCLUDED.documentation_urls,
    setup_guide             = EXCLUDED.setup_guide,
    additional_resources    = EXCLUDED.additional_resources,
    account_info            = EXCLUDED.account_info,
    topup_region            = EXCLUDED.topup_region,
    topup_player_name       = EXCLUDED.topup_player_name,
    topup_amount            = EXCLUDED.topup_amount,
    topup_game              = EXCLUDED.topup_game,
    transfer_instructions   = EXCLUDED.transfer_instructions,
    updated_at              = now();
END $$;

-- ─────────────────────────────────────────
-- 3. reveal_listing_credentials (legacy)
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.reveal_listing_credentials(p_listing_id UUID)
RETURNS TABLE (
  login_id TEXT,
  password TEXT,
  instructions TEXT,
  recovery_details TEXT,
  email_transfer_details TEXT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE k TEXT := public._credential_key();
BEGIN
  IF NOT public._can_access_credentials(p_listing_id) THEN
    RAISE EXCEPTION 'not authorized to reveal credentials for this listing';
  END IF;

  INSERT INTO public.credential_access_log(listing_id, accessed_by, access_type)
  VALUES (p_listing_id, auth.uid(), 'reveal');

  RETURN QUERY
    SELECT
      CASE WHEN lc.login_id_enc IS NOT NULL THEN pgp_sym_decrypt(lc.login_id_enc, k) ELSE NULL END,
      CASE WHEN lc.password_enc IS NOT NULL THEN pgp_sym_decrypt(lc.password_enc, k) ELSE NULL END,
      lc.instructions,
      CASE WHEN lc.recovery_details_enc IS NOT NULL THEN pgp_sym_decrypt(lc.recovery_details_enc, k) ELSE NULL END,
      CASE WHEN lc.email_transfer_details_enc IS NOT NULL THEN pgp_sym_decrypt(lc.email_transfer_details_enc, k) ELSE NULL END
    FROM public.listing_credentials lc
    WHERE lc.listing_id = p_listing_id;
END $$;

-- ─────────────────────────────────────────
-- 4. set_listing_credentials (legacy)
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_listing_credentials(
  p_listing_id uuid,
  p_login_id text,
  p_password text,
  p_instructions text DEFAULT NULL,
  p_recovery_details text DEFAULT NULL,
  p_email_transfer_details text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE k TEXT := public._credential_key();
BEGIN
  IF NOT (auth.uid() = (SELECT seller_id FROM public.listings WHERE id = p_listing_id) OR public.is_staff()) THEN
    RAISE EXCEPTION 'not authorized to set credentials for this listing';
  END IF;
  INSERT INTO public.listing_credentials AS lc (
    listing_id, login_id_enc, password_enc, instructions, recovery_details_enc, email_transfer_details_enc, updated_at
  ) VALUES (
    p_listing_id,
    CASE WHEN p_login_id IS NOT NULL THEN pgp_sym_encrypt(p_login_id, k) END,
    CASE WHEN p_password IS NOT NULL THEN pgp_sym_encrypt(p_password, k) END,
    p_instructions,
    CASE WHEN p_recovery_details IS NOT NULL THEN pgp_sym_encrypt(p_recovery_details, k) END,
    CASE WHEN p_email_transfer_details IS NOT NULL THEN pgp_sym_encrypt(p_email_transfer_details, k) END,
    now()
  )
  ON CONFLICT (listing_id) DO UPDATE SET
    login_id_enc = EXCLUDED.login_id_enc,
    password_enc = EXCLUDED.password_enc,
    instructions = EXCLUDED.instructions,
    recovery_details_enc = EXCLUDED.recovery_details_enc,
    email_transfer_details_enc = EXCLUDED.email_transfer_details_enc,
    updated_at = now();
END $$;
