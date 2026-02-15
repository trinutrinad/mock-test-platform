-- Migration: RPC to delete an exam and its attempts (avoids FK and RLS issues)
-- Run this in your Supabase SQL Editor if not using migration runner

BEGIN;

CREATE OR REPLACE FUNCTION public.delete_exam(target_exam_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow admins to delete exams
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Only admins can delete exams';
  END IF;

  -- Delete attempts for this exam (answers are cascade-deleted via attempts.id)
  DELETE FROM public.attempts WHERE exam_id = target_exam_id;

  -- Delete the exam (questions are cascade-deleted via exams.id)
  DELETE FROM public.exams WHERE id = target_exam_id;

  RETURN true;
END;
$$;

-- Allow authenticated users to call the function (function itself checks admin)
GRANT EXECUTE ON FUNCTION public.delete_exam(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_exam(uuid) TO service_role;

COMMIT;
