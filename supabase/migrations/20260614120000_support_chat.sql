-- Support chat between end users and admins
CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_user_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  sender_role text NOT NULL CHECK (sender_role IN ('user','admin')),
  content text NOT NULL CHECK (length(content) > 0 AND length(content) <= 2000),
  read_by_user boolean NOT NULL DEFAULT false,
  read_by_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_messages_conv ON public.support_messages(conversation_user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_support_messages_unread_admin ON public.support_messages(read_by_admin) WHERE read_by_admin = false;

GRANT SELECT, INSERT, UPDATE ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "support_select_own_or_admin"
ON public.support_messages FOR SELECT TO authenticated
USING (
  conversation_user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "support_insert_user"
ON public.support_messages FOR INSERT TO authenticated
WITH CHECK (
  sender_role = 'user'
  AND sender_id = auth.uid()
  AND conversation_user_id = auth.uid()
);

CREATE POLICY "support_insert_admin"
ON public.support_messages FOR INSERT TO authenticated
WITH CHECK (
  sender_role = 'admin'
  AND sender_id = auth.uid()
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "support_update_own_or_admin"
ON public.support_messages FOR UPDATE TO authenticated
USING (
  conversation_user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  conversation_user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
);

ALTER TABLE public.support_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
