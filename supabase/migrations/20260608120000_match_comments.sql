-- Match Comments: live + pre-match chat for fixtures
CREATE TABLE IF NOT EXISTS public.match_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  edited boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  deleted_by uuid,
  reported_count integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_match_comments_match_created
  ON public.match_comments (match_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_match_comments_user
  ON public.match_comments (user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_comments TO authenticated;
GRANT ALL ON public.match_comments TO service_role;

ALTER TABLE public.match_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read live comments"
  ON public.match_comments FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own comments"
  ON public.match_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can update own comments"
  ON public.match_comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND deleted_at IS NULL)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own or admin any"
  ON public.match_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.match_comment_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.match_comments(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (comment_id, reporter_id)
);

GRANT SELECT, INSERT ON public.match_comment_reports TO authenticated;
GRANT ALL ON public.match_comment_reports TO service_role;

ALTER TABLE public.match_comment_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own reports"
  ON public.match_comment_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Reporter or admin can read reports"
  ON public.match_comment_reports FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.increment_comment_report_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.match_comments
  SET reported_count = reported_count + 1
  WHERE id = NEW.comment_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_increment_comment_report
  AFTER INSERT ON public.match_comment_reports
  FOR EACH ROW EXECUTE FUNCTION public.increment_comment_report_count();

CREATE OR REPLACE FUNCTION public.touch_match_comment()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.content IS DISTINCT FROM OLD.content THEN
    NEW.edited = true;
    NEW.updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_touch_match_comment
  BEFORE UPDATE ON public.match_comments
  FOR EACH ROW EXECUTE FUNCTION public.touch_match_comment();

ALTER PUBLICATION supabase_realtime ADD TABLE public.match_comments;
