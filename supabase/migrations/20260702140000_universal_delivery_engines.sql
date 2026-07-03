-- Migration: Universal Delivery Engines Check Constraints
-- Date: 2026-07-02

-- 1. Drop existing delivery_engine_check check constraint
alter table public.category_engine_config drop constraint if exists delivery_engine_check;

-- 2. Add updated delivery_engine_check check constraint supporting the expanded delivery engines
alter table public.category_engine_config add constraint delivery_engine_check check (
  delivery_engine in (
    'Instant', 'Credentials', 'Manual', 'Session', 'Booking', 'Hybrid', 'Custom', 'Appointment', 'File', 'OTP', 'Admin'
  )
);
