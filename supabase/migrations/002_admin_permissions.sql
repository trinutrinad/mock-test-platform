-- Migration: Allow Admins to manage Attempts and Answers
-- Run this in your Supabase SQL Editor

BEGIN;

-- Policy for Attempts
DROP POLICY IF EXISTS "Admins manage attempts" ON public.attempts;
CREATE POLICY "Admins manage attempts" ON public.attempts
  FOR ALL
  USING (auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'));

-- Policy for Answers
DROP POLICY IF EXISTS "Admins manage answers" ON public.answers;
CREATE POLICY "Admins manage answers" ON public.answers
  FOR ALL
  USING (auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'));

COMMIT;
