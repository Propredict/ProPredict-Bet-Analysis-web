import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSupportChat, useSupportUnreadBadge } from "@/hooks/useSupportChat";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { cn } from "@/lib/utils";

/**
 * Floating support chat — only for logged-in non-admin users.
 * Sends messages to the admin team; admins reply from /admin/support and the
 * user sees the reply in this same panel in realtime.
 */
export function SupportChatWidget() {
  const { user } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useAdminAccess();
  const [open, setOpen] = useState(false);
  const { messages, send, markRead, loading } = useSupportChat(!!user && open);
  const badgeCount = useSupportUnreadBadge();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      markRead();
      // scroll to bottom
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
      });
    }
  }, [open, messages.length, markRead]);

  if (!user || adminLoading || isAdmin) return null;

  const handleSend = async () => {
    const v = text.trim();
    if (!v || sending) return;
    setSending(true);
    try {
      await send(v);
      setText("");
    } catch (e) {
      console.error("[SupportChat] send failed", e);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open support chat"
          className="fixed bottom-44 right-4 md:bottom-16 md:right-4 z-50 h-9 w-9 md:h-11 md:w-11 rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/40 flex items-center justify-center hover:scale-105 transition-transform"
        >
          <MessageCircle className="h-5 w-5 md:h-6 md:w-6" />
          {badgeCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow">
              {badgeCount > 9 ? "9+" : badgeCount}
            </span>
          )}
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed inset-x-2 bottom-20 md:inset-auto md:bottom-6 md:right-6 md:w-[360px] z-50 rounded-2xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden max-h-[70vh] md:max-h-[520px]">
          <div className="flex items-center justify-between px-3 py-2 bg-primary text-primary-foreground">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              <span className="text-sm font-bold">ProPredict Support</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close support chat"
              className="h-7 w-7 rounded-md hover:bg-primary-foreground/10 flex items-center justify-center"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-background">
            {loading && messages.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Loading…</p>
            ) : messages.length === 0 ? (
              <div className="text-center py-6 px-2">
                <p className="text-sm font-semibold text-foreground">Hi 👋</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Ask us anything — payments, subscriptions, predictions. We'll reply right here.
                </p>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "flex",
                    m.sender_role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words",
                      m.sender_role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted text-foreground rounded-bl-sm"
                    )}
                  >
                    {m.sender_role === "admin" && (
                      <div className="text-[10px] font-bold text-primary mb-0.5">Support</div>
                    )}
                    {m.content}
                    <div className="text-[9px] opacity-60 mt-1 text-right">
                      {new Date(m.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-border p-2 flex items-end gap-2 bg-card">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type a message…"
              rows={1}
              maxLength={2000}
              className="flex-1 resize-none rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary max-h-24"
            />
            <button
              onClick={handleSend}
              disabled={sending || !text.trim()}
              className="h-9 w-9 rounded-md bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}