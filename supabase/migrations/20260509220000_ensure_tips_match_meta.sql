ALTER TABLE public.tips
  ADD COLUMN IF NOT EXISTS match_id text,
  ADD COLUMN IF NOT EXISTS match_time text,
  ADD COLUMN IF NOT EXISTS match_date date;

NOTIFY pgrst, 'reload schema';
