-- Migration: Add explicit foreign key relationships to public.profiles(id)
-- This allows PostgREST / Supabase JS client to perform joins between these tables and profiles.

ALTER TABLE public.staff_tasks
  DROP CONSTRAINT IF EXISTS staff_tasks_assigned_to_profiles_fkey,
  ADD CONSTRAINT staff_tasks_assigned_to_profiles_fkey
  FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.staff_tasks
  DROP CONSTRAINT IF EXISTS staff_tasks_created_by_profiles_fkey,
  ADD CONSTRAINT staff_tasks_created_by_profiles_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.campaigns
  DROP CONSTRAINT IF EXISTS campaigns_created_by_profiles_fkey,
  ADD CONSTRAINT campaigns_created_by_profiles_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.security_incidents
  DROP CONSTRAINT IF EXISTS security_incidents_user_id_profiles_fkey,
  ADD CONSTRAINT security_incidents_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.security_incidents
  DROP CONSTRAINT IF EXISTS security_incidents_resolved_by_profiles_fkey,
  ADD CONSTRAINT security_incidents_resolved_by_profiles_fkey
  FOREIGN KEY (resolved_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.announcements
  DROP CONSTRAINT IF EXISTS announcements_created_by_profiles_fkey,
  ADD CONSTRAINT announcements_created_by_profiles_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.emergency_alerts
  DROP CONSTRAINT IF EXISTS emergency_alerts_created_by_profiles_fkey,
  ADD CONSTRAINT emergency_alerts_created_by_profiles_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
