-- Attach publish-notification triggers to tips and tickets
-- so admin-published content also fires push notifications.
-- The send-push-notification edge function already enforces:
--   * 3h per-user cooldown
--   * skip for AI categories (handled by summary push)

DROP TRIGGER IF EXISTS trg_notify_tip_published ON public.tips;
CREATE TRIGGER trg_notify_tip_published
AFTER INSERT OR UPDATE OF status ON public.tips
FOR EACH ROW
EXECUTE FUNCTION public.notify_tip_published();

DROP TRIGGER IF EXISTS trg_notify_ticket_published ON public.tickets;
CREATE TRIGGER trg_notify_ticket_published
AFTER INSERT OR UPDATE OF status ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.notify_ticket_published();
