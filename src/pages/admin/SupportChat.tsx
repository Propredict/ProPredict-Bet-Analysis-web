import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Send, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import type { SupportMessage } from "@/hooks/useSupportChat";

const db = supabase as any;

interface ConversationRow {
  conversation_user_id: string;
  last_content: string;
  last_at: string;
  unread: number;
  email: string | null;
  full_name: string | null;
  username: string | null;
}

export default function AdminSupportChat() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    setLoadingConvs(true);
    const { data: msgs } = await db
      .from("support_messages")
      .select("conversation_user_id, content, created_at, sender_role, read_by_admin")
      .order("created_at", { ascending: false })
      .limit(1000);

    const byUser = new Map<string, ConversationRow>();
    (msgs ?? []).forEach((m: any) => {
      const existing = byUser.get(m.conversation_user_id);
      if (!existing) {
        byUser.set(m.conversation_user_id, {
          conversation_user_id: m.conversation_user_id,
          last_content: m.content,
          last_at: m.created_at,
          unread: m.sender_role === "user" && !m.read_by_admin ? 1 : 0,
          email: null,
          full_name: null,
          username: null,
        });
      } else {
        if (m.sender_role === "user" && !m.read_by_admin) existing.unread += 1;
      }
    });

    const ids = Array.from(byUser.keys());
    if (ids.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, email, full_name, username")
        .in("user_id", ids);
      (profs ?? []).forEach((p: any) => {
        const row = byUser.get(p.user_id);
        if (row) {
          row.email = p.email;
          row.full_name = p.full_name;
          row.username = p.username;
        }
      });
    }

    const list = Array.from(byUser.values()).sort(
      (a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime()
    );
    setConversations(list);
    setLoadingConvs(false);
    if (!activeId && list.length > 0) setActiveId(list[0].conversation_user_id);
  }, [activeId]);

  const loadMessages = useCallback(async (uid: string) => {
    const { data } = await db
      .from("support_messages")
      .select("*")
      .eq("conversation_user_id", uid)
      .order("created_at", { ascending: true })
      .limit(500);
    setMessages((data ?? []) as SupportMessage[]);
    // mark all user messages as read by admin
    await db
      .from("support_messages")
      .update({ read_by_admin: true })
      .eq("conversation_user_id", uid)
      .eq("sender_role", "user")
      .eq("read_by_admin", false);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    });
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (activeId) loadMessages(activeId);
  }, [activeId, loadMessages]);

  // Realtime: any change in support_messages -> refresh
  useEffect(() => {
    const channel = supabase
      .channel("admin-support")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_messages" },
        (payload: any) => {
          loadConversations();
          const uid =
            (payload.new && payload.new.conversation_user_id) ||
            (payload.old && payload.old.conversation_user_id);
          if (uid && uid === activeId) loadMessages(uid);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeId, loadConversations, loadMessages]);

  const handleSend = async () => {
    const v = text.trim();
    if (!v || !activeId || !user || sending) return;
    setSending(true);
    try {
      const { error } = await db.from("support_messages").insert({
        conversation_user_id: activeId,
        sender_id: user.id,
        sender_role: "admin",
        content: v.slice(0, 2000),
        read_by_admin: true,
      });
      if (error) throw error;
      setText("");
    } catch (e) {
      console.error("[AdminSupport] send failed", e);
    } finally {
      setSending(false);
    }
  };

  const activeConv = useMemo(
    () => conversations.find((c) => c.conversation_user_id === activeId) ?? null,
    [conversations, activeId]
  );

  return (
    <>
      <Helmet>
        <title>Support Chat – Admin</title>
      </Helmet>
      <div className="px-3 py-4 space-y-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-extrabold">Support Inbox</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-3 h-[calc(100vh-180px)] min-h-[480px]">
          {/* Conversations list */}
          <div className="border border-border rounded-lg overflow-y-auto bg-card">
            {loadingConvs ? (
              <p className="p-3 text-xs text-muted-foreground">Loading…</p>
            ) : conversations.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No conversations yet.</p>
            ) : (
              conversations.map((c) => {
                const isActive = c.conversation_user_id === activeId;
                const label =
                  c.full_name || c.username || c.email || c.conversation_user_id.slice(0, 8);
                return (
                  <button
                    key={c.conversation_user_id}
                    onClick={() => setActiveId(c.conversation_user_id)}
                    className={cn(
                      "w-full text-left px-3 py-2 border-b border-border hover:bg-muted/50 transition-colors",
                      isActive && "bg-muted"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold truncate">{label}</span>
                      {c.unread > 0 && (
                        <span className="h-5 min-w-[20px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                          {c.unread}
                        </span>
                      )}
                    </div>
                    {c.email && (
                      <div className="text-[10px] text-muted-foreground truncate">{c.email}</div>
                    )}
                    <div className="text-xs text-muted-foreground truncate mt-0.5">
                      {c.last_content}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(c.last_at).toLocaleString()}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Active conversation */}
          <div className="border border-border rounded-lg flex flex-col bg-card overflow-hidden">
            {!activeConv ? (
              <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                Select a conversation to reply.
              </div>
            ) : (
              <>
                <div className="px-3 py-2 border-b border-border bg-muted/30">
                  <div className="text-sm font-bold">
                    {activeConv.full_name || activeConv.username || activeConv.email || "User"}
                  </div>
                  {activeConv.email && (
                    <div className="text-[11px] text-muted-foreground">{activeConv.email}</div>
                  )}
                </div>
                <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-background">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        "flex",
                        m.sender_role === "admin" ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[75%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words",
                          m.sender_role === "admin"
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-muted text-foreground rounded-bl-sm"
                        )}
                      >
                        {m.content}
                        <div className="text-[9px] opacity-60 mt-1 text-right">
                          {new Date(m.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border p-2 flex items-end gap-2">
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Reply to user…"
                    rows={2}
                    maxLength={2000}
                    className="flex-1 resize-none rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary max-h-32"
                  />
                  <button
                    onClick={handleSend}
                    disabled={sending || !text.trim()}
                    className="h-10 w-10 rounded-md bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50"
                    aria-label="Send reply"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}