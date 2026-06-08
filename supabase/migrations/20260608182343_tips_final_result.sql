-- Add final_result column to tips (admin-entered actual match outcome, e.g. "3-1")
ALTER TABLE public.tips ADD COLUMN IF NOT EXISTS final_result text;
