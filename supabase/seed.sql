-- Insert Sample Exam
INSERT INTO public.exams (id, name, duration, is_active)
VALUES 
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'APPSC Group II - General Studies Mock 1', 60, true),
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'APPSC Group II - History Mock 1', 30, true);

-- Insert Sample Questions for Exam 1
INSERT INTO public.questions (exam_id, question, option_a, option_b, option_c, option_d, correct_option)
VALUES
  (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Who was the first Chief Minister of Andhra Pradesh after formation in 1956?',
    'N. T. Rama Rao',
    'Neelam Sanjiva Reddy',
    'Tanguturi Prakasam',
    'Kasu Brahmananda Reddy',
    'B'
  ),
  (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Which river is known as the "Ganga of the South"?',
    'Krishna',
    'Godavari',
    'Kaveri',
    'Tungabhadra',
    'C'
  ),
  (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'The "Kuchipudi" dance form originated in which village of Andhra Pradesh?',
    'Kuchipudi',
    'Mangalagiri',
    'Srikalahasti',
    'Amaravati',
    'A'
  ),
  (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'When was the Andhra State formed?',
    '1950',
    '1953',
    '1956',
    '1947',
    'B'
  ),
  (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'Which district in AP has the longest coastline?',
    'Nellore',
    'Srikakulam',
    'Visakhapatnam',
    'Prakasham',
    'B'
  );
