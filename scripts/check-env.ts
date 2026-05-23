import * as dotenv from 'dotenv';

dotenv.config();

const requiredVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'OWNER_EMAIL',
  'OWNER_PASSWORD',
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD',
  'BUYER_EMAIL',
  'BUYER_PASSWORD',
  'SELLER_EMAIL',
  'SELLER_PASSWORD',
];

let missing = [] as string[];
for (const v of requiredVars) {
  if (!process.env[v]) {
    missing.push(v);
  }
}

if (missing.length > 0) {
  console.error('❌ Missing required environment variables:');
  missing.forEach((v) => console.error(` - ${v}`));
  process.exit(1);
} else {
  console.log('✅ All required environment variables are set.');
  process.exit(0);
}
