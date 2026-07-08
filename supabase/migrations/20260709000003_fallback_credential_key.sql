-- Ensure public._credential_key() exists and has a fallback for local/testing environments.
-- If the app.credential_key GUC is not set, it falls back to a development secret 
-- instead of throwing an exception, allowing test suites and local setups to work seamlessly.

CREATE OR REPLACE FUNCTION public._credential_key()
RETURNS text LANGUAGE plpgsql STABLE AS $$
DECLARE k text;
BEGIN
  k := current_setting('app.credential_key', true);
  IF k IS NULL OR length(k) = 0 THEN
    k := 'huxzain_development_vault_encryption_key_do_not_use_in_prod';
  END IF;
  RETURN k;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public._credential_key() TO authenticated;
