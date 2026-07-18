-- Add category column to internal_notifications table for classification
ALTER TABLE public.internal_notifications
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general' CHECK (category IN ('disputes', 'payments', 'tickets', 'orders', 'general'));
