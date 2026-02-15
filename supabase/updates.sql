-- 1. DROP VIEW FIRST IF EXISTS (Structure Dependency)
DROP VIEW IF EXISTS public.leaderboard;

-- 2. Add columns to exams table
ALTER TABLE public.exams 
ADD COLUMN IF NOT EXISTS negative_mark NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS marks NUMERIC DEFAULT 1;

-- 3. Add time_taken to attempts if not exists
ALTER TABLE public.attempts 
ADD COLUMN IF NOT EXISTS time_taken INTEGER DEFAULT 0;

-- 4. Change score column to NUMERIC
ALTER TABLE public.attempts ALTER COLUMN score TYPE NUMERIC;

-- 5. Secure Submission RPC (Updated for Variable Marks + Negative Marking + Time)
CREATE OR REPLACE FUNCTION submit_exam(exam_id uuid, answers jsonb, time_taken integer DEFAULT 0)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_attempt_id uuid;
  v_score numeric := 0; 
  v_negative_mark numeric;
  v_marks_per_question numeric;
  v_rec record;
  v_correct_option text;
BEGIN
  -- Get exam details
  SELECT negative_mark, marks INTO v_negative_mark, v_marks_per_question
  FROM public.exams
  WHERE id = submit_exam.exam_id;

  -- Default values
  IF v_marks_per_question IS NULL THEN v_marks_per_question := 1; END IF;
  IF v_negative_mark IS NULL THEN v_negative_mark := 0; END IF;

  -- Create attempt
  INSERT INTO public.attempts (user_id, exam_id, score, time_taken, submitted_at)
  VALUES (auth.uid(), submit_exam.exam_id, 0, submit_exam.time_taken, now())
  RETURNING id INTO v_attempt_id;

  -- Process answers
  FOR v_rec IN SELECT * FROM jsonb_to_recordset(submit_exam.answers) AS x(question_id uuid, selected_option text)
  LOOP
    -- Get correct option
    SELECT correct_option INTO v_correct_option
    FROM public.questions
    WHERE id = v_rec.question_id;

    IF v_rec.selected_option IS NOT NULL AND v_rec.selected_option != '' THEN
        IF v_correct_option = v_rec.selected_option THEN
          v_score := v_score + v_marks_per_question;
        ELSE
          v_score := v_score - v_negative_mark;
        END IF;

        -- Store answer
        INSERT INTO public.answers (attempt_id, question_id, selected_option)
        VALUES (v_attempt_id, v_rec.question_id, v_rec.selected_option);
    END IF;
  END LOOP;

  -- Update final score
  UPDATE public.attempts
  SET score = v_score
  WHERE id = v_attempt_id;

  RETURN v_attempt_id;
END;
$$;

-- 6. Re-create Leaderboard View
CREATE OR REPLACE VIEW public.leaderboard AS
SELECT 
  a.exam_id,
  u.email,
  a.score,
  a.time_taken,
  a.submitted_at,
  rank() OVER (PARTITION BY a.exam_id ORDER BY a.score DESC, a.time_taken ASC) as rank
FROM public.attempts a
JOIN public.users u ON a.user_id = u.id;
