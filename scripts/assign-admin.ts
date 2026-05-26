import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Email to promote to admin. Pass as first CLI argument or default.
const EMAIL = process.argv[2] ?? 'rammodhvadiya210@gmail.com';

async function main() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('Supabase URL or service role key missing in environment variables.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  // Find the user by email.
  const { data: user, error: userErr } = await supabase
    .from('profiles')
    .select('id,email')
    .eq('email', EMAIL)
    .maybeSingle();

  if (userErr) {
    console.error('Error fetching user:', userErr.message);
    process.exit(1);
  }
  if (!user) {
    console.error(`User with email ${EMAIL} not found.`);
    process.exit(1);
  }

  // Check if admin role already exists.
  const { data: existing, error: roleErr } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin');

  if (roleErr) {
    console.error('Error checking existing roles:', roleErr.message);
    process.exit(1);
  }

  if (existing && existing.length > 0) {
    console.log(`User ${EMAIL} already has admin role.`);
    return;
  }

  // Insert admin role.
  const { error: insertErr } = await supabase
    .from('user_roles')
    .insert({ user_id: user.id, role: 'admin' });

  if (insertErr) {
    console.error('Failed to assign admin role:', insertErr.message);
    process.exit(1);
  }

  console.log(`Admin role assigned to ${EMAIL}.`);
}

main().catch((e) => {
  console.error('Unexpected error:', e);
  process.exit(1);
});
