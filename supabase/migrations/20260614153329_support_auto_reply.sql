-- Auto-reply to the user's very first support message
CREATE OR REPLACE FUNCTION public.support_auto_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing int;
BEGIN
  IF NEW.sender_role <> 'user' THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO v_existing
  FROM public.support_messages
  WHERE conversation_user_id = NEW.conversation_user_id
    AND id <> NEW.id;

  IF v_existing > 0 THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.support_messages (
    conversation_user_id, sender_id, sender_role, content, read_by_admin, read_by_user
  ) VALUES (
    NEW.conversation_user_id,
    NEW.conversation_user_id,
    'admin',
    'Thank you for contacting ProPredict! 🙌 We have received your message and our team will get back to you as soon as possible.',
    true,
    false
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_support_auto_reply ON public.support_messages;
CREATE TRIGGER trg_support_auto_reply
AFTER INSERT ON public.support_messages
FOR EACH ROW EXECUTE FUNCTION public.support_auto_reply();
