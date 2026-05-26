# HUXZAIN Backend — ENV-Driven Architecture

This project's backend is **ENV-ready**: paste your Supabase URL + anon key
(plus Razorpay / Resend secrets when you need them) and authentication,
roles, dashboards, and the marketplace data layer light up automatically —
no UI redesign needed.

## 1. Quick start

1. Copy `.env.example` → `.env.local` and fill in:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
2. Open your Supabase SQL editor and run `docs/SCHEMA.sql` once.
3. In **Supabase → Authentication → URL Configuration**, add redirect URLs:
   - `http://localhost:5173/auth/callback`
   - `https://yourdomain.com/auth/callback`
   - `http://localhost:5173/reset-password`
4. Enable the providers you want (Email, Google, Apple). Email confirmations
   are on by default.

When `VITE_SUPABASE_*` is missing the UI still renders — auth forms show a
gold-bordered notice and dashboards display empty states.

## 2. Roles & permissions

Defined in `src/lib/roles.ts`. Roles are **never** stored on the profile
table — they live in `public.user_roles` and are checked via the
`SECURITY DEFINER` SQL function `has_role(uid, role)` (see SCHEMA.sql).

| Role          | Purpose                                |
| ------------- | -------------------------------------- |
| `buyer`       | Default for every new signup           |
| `seller`      | Can list, fulfill orders, withdraw     |
| `moderator`   | Approve listings, mediate disputes     |
| `staff`       | Customer support / triage              |
| `admin`       | Full marketplace operations            |
| `super_admin` | Every permission, manages other admins |

Use it in components:

```tsx
const { hasRole, can } = useAuth();
if (!can("payout:approve")) return null;
```

## 3. Routing & guards

- Public routes live at the top level (`/`, `/category/$slug`, `/login`, …).
- Protected routes live under `src/routes/_authenticated/` — the
  `_authenticated.tsx` layout redirects unauthenticated visitors to `/login?redirect=…`.
- The **Seller Panel** lives at `/seller/*` and uses `SellerShell` for its
  sticky sidebar.
- The **Admin Console** lives at `/admin/*` and additionally checks that the
  user has `admin`, `super_admin`, `moderator`, or `staff` role.

## 4. Data services

All Supabase access is funneled through `src/lib/marketplace/services.ts`
(listings, orders, wallet, payouts, reviews, disputes, notifications,
support tickets, coupons, boosts). Each function returns
`{ data, error }` and gracefully reports
`"Backend not configured"` when the Supabase env isn't set yet.

## 5. Where to add new logic

| Concern             | File                                                       |
| ------------------- | ---------------------------------------------------------- |
| New env var         | `.env.example` + `src/lib/env.ts`                          |
| New role/permission | `src/lib/roles.ts`                                         |
| New entity/table    | `docs/SCHEMA.sql` + `marketplace/types.ts` + `services.ts` |
| New seller page     | `src/routes/_authenticated/seller.<slug>.tsx`              |
| New admin page      | `src/routes/_authenticated/admin.<slug>.tsx`               |
| Server-only secrets | Read `process.env.*` inside `createServerFn` handlers only |

## 6. Razorpay / Resend / WordPress

These are wired as ENV stubs only — fill in the keys when you're ready and
add `createServerFn` handlers in `src/lib/<feature>.functions.ts`. Never
import server secrets from client code.
