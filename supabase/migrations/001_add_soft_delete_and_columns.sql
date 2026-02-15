-- Migration: add soft-delete and missing columns to exams
BEGIN;

ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS marks NUMERIC DEFAULT 1;

ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS negative_mark NUMERIC DEFAULT 0;

ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_exams_is_deleted ON public.exams(is_deleted);

COMMIT;
