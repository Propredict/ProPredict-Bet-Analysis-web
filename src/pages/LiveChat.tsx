import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Send, Trash2, Loader2 } from "lucide-react";

interface ChatMessage {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  content: string;
  created_at: string;
}

const MAX_LEN = 500;

export default function LiveChat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const { data, error } = await (supabase as any)
        .from("community_messages")
        .select("id, user_id, display_name, avatar_url, content, created_at")
        .order("created_at", { ascending: false })
        .limit(100);

      if (!active) return;
      if (error) {
        console.error("Live chat load error:", error);
      } else {
        setMessages(((data ?? []) as ChatMessage[]).slice().reverse());
      }
      setLoading(false);
      setTimeout(scrollToBottom, 100);
    };

    load();

    const channel = supabase
      .channel("community-chat")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "community_messages" },
        (payload) => {
          setMessages((prev) => {
            const msg = payload.new as ChatMessage;
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg].slice(-200);
          });
          setTimeout(scrollToBottom, 60);
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "community_messages" },
        (payload) => {
          const old = payload.old as { id?: string };
          setMessages((prev) => prev.filter((m) => m.id !== old?.id));
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [scrollToBottom]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = text.trim();
    if (!content || !user || sending) return;

    setSending(true);
    const meta = (user.user_metadata ?? {}) as Record<string, string | undefined>;
    const { error } = await (supabase as any).from("community_messages").insert({
      user_id: user.id,
      display_name: meta.full_name || meta.username || user.email?.split("@")[0] || "Member",
      avatar_url: meta.avatar_url ?? null,
      content: content.slice(0, MAX_LEN),
    });
    setSending(false);

    if (error) {
      toast({ title: "Message not sent", description: error.message, variant: "destructive" });
      return;
    }
    setText("");
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any).from("community_messages").delete().eq("id", id);
    if (error) {
      toast({ title: "Could not delete", description: error.message, variant: "destructive" });
      return;
    }
    setMessages((prev) => prev.filter((m) => m.id !== id));
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-4">
      <PageHero
        title="Live Chat"
        subtitle="Talk with other members about today's matches and picks"
        icon={MessageCircle}
        badge="Community"
      />

      <div className="rounded-2xl border-2 border-primary/30 bg-card shadow-md">
        <div className="max-h-[60vh] min-h-[320px] space-y-3 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading chat...
            </div>
          ) : messages.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No messages yet — be the first to write something.
            </p>
          ) : (
            messages.map((m) => {
              const mine = user?.id === m.user_id;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`group max-w-[85%] rounded-xl border px-3 py-2 sm:max-w-[70%] ${
                      mine
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-primary/25 bg-secondary/50 text-foreground"
                    }`}
                  >
                    <div className="mb-0.5 flex items-center gap-2">
                      <span className={`text-xs font-bold ${mine ? "text-primary-foreground" : "text-sidebar"}`}>
                        {mine ? "You" : m.display_name || "Member"}
                      </span>
                      <span className={`text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {formatTime(m.created_at)}
                      </span>
                      {mine && (
                        <button
                          type="button"
                          onClick={() => handleDelete(m.id)}
                          className="ml-auto opacity-60 transition-opacity hover:opacity-100"
                          aria-label="Delete message"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap break-words text-sm leading-snug">{m.content}</p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-primary/20 p-3">
          {user ? (
            <form onSubmit={handleSend} className="flex items-center gap-2">
              <Input
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
                placeholder="Write a message..."
                className="h-11 flex-1"
                maxLength={MAX_LEN}
              />
              <Button type="submit" className="h-11 px-4 font-bold" disabled={!text.trim() || sending}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          ) : (
            <div className="flex flex-col items-center gap-2 py-3 text-center">
              <p className="text-sm text-muted-foreground">Sign in to join the conversation.</p>
              <Button asChild className="font-bold">
                <Link to="/auth">Sign In</Link>
              </Button>
            </div>
          )}
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Be respectful. For entertainment only. 18+
          </p>
        </div>
      </div>
    </div>
  );
}
