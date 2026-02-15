-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- USERS TABLE (Extends Supabase Auth)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role TEXT CHECK (role IN ('user', 'admin')) DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- EXAMS TABLE
CREATE TABLE IF NOT EXISTS public.exams (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  duration INTEGER NOT NULL, -- in minutes
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- QUESTIONS TABLE
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_option TEXT CHECK (correct_option IN ('A', 'B', 'C', 'D')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ATTEMPTS TABLE
CREATE TABLE IF NOT EXISTS public.attempts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) NOT NULL,
  exam_id UUID REFERENCES public.exams(id) NOT NULL,
  score INTEGER DEFAULT 0,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ANSWERS TABLE
CREATE TABLE IF NOT EXISTS public.answers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  attempt_id UUID REFERENCES public.attempts(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES public.questions(id) NOT NULL,
  selected_option TEXT CHECK (selected_option IN ('A', 'B', 'C', 'D')) NOT NULL
);

-- RLS POLICIES
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid errors on re-run (or use IF NOT EXISTS manually in UI)
-- Since this is a specialized script, we'll use DO blocks or simple CREATE POLICY IF NOT EXISTS logic isn't standard in pure SQL without PL/pgSQL usually, but Supabase editor allows multiple statements.
-- We will assume clean state or ignore errors. Better to drop policies first if re-running.

DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Public view active exams" ON public.exams;
CREATE POLICY "Public view active exams" ON public.exams FOR SELECT USING (is_active = true OR auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'));

DROP POLICY IF EXISTS "Admins manage exams" ON public.exams;
CREATE POLICY "Admins manage exams" ON public.exams FOR ALL USING (auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'));

DROP POLICY IF EXISTS "View questions of active exams" ON public.questions;
CREATE POLICY "View questions of active exams" ON public.questions FOR SELECT USING (
  exam_id IN (SELECT id FROM public.exams WHERE is_active = true) OR 
  auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin')
);

DROP POLICY IF EXISTS "Admins manage questions" ON public.questions;
CREATE POLICY "Admins manage questions" ON public.questions FOR ALL USING (auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'));

DROP POLICY IF EXISTS "Users view own attempts" ON public.attempts;
CREATE POLICY "Users view own attempts" ON public.attempts FOR SELECT USING (auth.uid() = user_id);
-- Insert policy handled by RPC now, but keeping for manual testing
DROP POLICY IF EXISTS "Users insert own attempts" ON public.attempts;
CREATE POLICY "Users insert own attempts" ON public.attempts FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users view own answers" ON public.answers;
CREATE POLICY "Users view own answers" ON public.answers FOR SELECT USING (attempt_id IN (SELECT id FROM public.attempts WHERE user_id = auth.uid()));
DROP POLICY IF EXISTS "Users insert own answers" ON public.answers;
CREATE POLICY "Users insert own answers" ON public.answers FOR INSERT WITH CHECK (attempt_id IN (SELECT id FROM public.attempts WHERE user_id = auth.uid()));

-- SECURE SUBMISSION RPC
CREATE OR REPLACE FUNCTION submit_exam(exam_id uuid, answers jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_attempt_id uuid;
  v_score integer := 0;
  v_rec record;
  v_correct_option text;
BEGIN
  -- Create attempt
  INSERT INTO public.attempts (user_id, exam_id, score, submitted_at)
  VALUES (auth.uid(), submit_exam.exam_id, 0, now())
  RETURNING id INTO v_attempt_id;

  -- Process answers
  FOR v_rec IN SELECT * FROM jsonb_to_recordset(submit_exam.answers) AS x(question_id uuid, selected_option text)
  LOOP
    -- Calculate score
    SELECT correct_option INTO v_correct_option
    FROM public.questions
    WHERE id = v_rec.question_id;

    IF v_correct_option = v_rec.selected_option THEN
      v_score := v_score + 1;
    END IF;

    -- Store answer
    INSERT INTO public.answers (attempt_id, question_id, selected_option)
    VALUES (v_attempt_id, v_rec.question_id, v_rec.selected_option);
  END LOOP;

  -- Update final score
  UPDATE public.attempts
  SET score = v_score
  WHERE id = v_attempt_id;

  RETURN v_attempt_id;
END;
$$;

-- TRIGGER for new user (Idempotent)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (new.id, new.email, 'user')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
