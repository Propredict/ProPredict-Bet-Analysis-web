import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Send, Trash2, Loader2, ChevronDown, ChevronUp } from "lucide-react";

interface ChatMessage {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  content: string;
  created_at: string;
}

const MAX_LEN = 500;
const OPEN_KEY = "propredict:live_chat_open";

const isDesktop = () =>
  typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches;

export function LiveChatDock() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    // Desktop: show the chat box open by default so the frame is visible.
    // Mobile: remember the user's last choice.
    if (isDesktop()) return true;
    return localStorage.getItem(OPEN_KEY) === "1";
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const openRef = useRef(open);
  openRef.current = open;

  // Use the profile username (e.g. "soccerx") as the chat display name
  const [profileUsername, setProfileUsername] = useState<string | null>(null);
  const profileUsernameRef = useRef<string | null>(null);
  profileUsernameRef.current = profileUsername;
  useEffect(() => {
    let active = true;
    setProfileUsername(null);
    if (!user?.id) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("profiles")
        .select("username")
        .eq("user_id", user.id)
        .single();
      if (active && data?.username) setProfileUsername(data.username as string);
    })();
    return () => {
      active = false;
    };
  }, [user?.id]);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    // Persist the open/closed choice only on mobile; desktop always opens by default.
    if (!isDesktop()) localStorage.setItem(OPEN_KEY, open ? "1" : "0");
    if (open) {
      setUnread(0);
      setTimeout(scrollToBottom, 120);
    }
  }, [open, scrollToBottom]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const { data, error } = await (supabase as any)
        .from("community_messages")
        .select("id, user_id, display_name, avatar_url, content, created_at")
        .order("created_at", { ascending: false })
        .limit(80);
      if (!active) return;
      if (!error) setMessages(((data ?? []) as ChatMessage[]).slice().reverse());
      setLoading(false);
      setTimeout(scrollToBottom, 120);
    };

    load();

    const channel = supabase
      .channel("community-chat-dock")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "community_messages" },
        (payload) => {
          const msg = payload.new as ChatMessage;
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg].slice(-150)));
          if (openRef.current) setTimeout(scrollToBottom, 60);
          else setUnread((n) => n + 1);
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
    const displayName =
      profileUsernameRef.current ||
      meta.username ||
      meta.full_name ||
      user.email?.split("@")[0] ||
      "Member";
    const { error } = await (supabase as any).from("community_messages").insert({
      user_id: user.id,
      display_name: displayName,
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
    if (!error) setMessages((prev) => prev.filter((m) => m.id !== id));
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (!open) {
    return (
      <>
        {/* Mobile: pill button with label so it's obvious it's chat */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open live chat"
          className="fixed bottom-24 left-3 z-40 flex h-12 items-center gap-2 rounded-full border-2 border-primary/50 bg-gradient-to-br from-sidebar to-primary pl-3 pr-4 text-primary-foreground shadow-xl shadow-primary/30 md:hidden"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="text-sm font-black uppercase tracking-wide">Chat</span>
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 rounded-full bg-success px-1.5 py-0.5 text-[9px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
        {/* Desktop: full box in the bottom-right corner */}
        <div className="fixed bottom-4 right-4 z-40 hidden w-[330px] md:block">
          <div className="overflow-hidden rounded-xl border-2 border-primary/50 bg-card shadow-xl shadow-primary/20">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex w-full items-center gap-2 bg-gradient-to-r from-sidebar via-sidebar-accent to-primary/80 px-3 py-2.5 text-left"
            >
              <span className="rounded-lg bg-primary/25 p-1.5 text-primary-foreground">
                <MessageCircle className="h-4 w-4" />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-black text-primary-foreground">Live Chat</span>
                <span className="block text-[10px] text-primary-foreground/70">Talk with other members</span>
              </span>
              {unread > 0 && (
                <span className="rounded-full bg-success px-2 py-0.5 text-[10px] font-bold text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
              <ChevronUp className="h-4 w-4 text-primary-foreground" />
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="fixed bottom-24 left-3 z-40 w-[calc(100vw-1.5rem)] max-w-[330px] md:bottom-4 md:left-auto md:right-4">
      <div className="overflow-hidden rounded-xl border-2 border-primary/50 bg-card shadow-xl shadow-primary/20">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex w-full items-center gap-2 bg-gradient-to-r from-sidebar via-sidebar-accent to-primary/80 px-3 py-2.5 text-left"
        >
          <span className="rounded-lg bg-primary/25 p-1.5 text-primary-foreground">
            <MessageCircle className="h-4 w-4" />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-black text-primary-foreground">Live Chat</span>
            <span className="block text-[10px] text-primary-foreground/70">Talk with other members</span>
          </span>
          <ChevronDown className="h-4 w-4 text-primary-foreground" />
        </button>

        {open && (
          <>
            <div className="h-64 space-y-2 overflow-y-auto p-3">
              {loading ? (
                <div className="flex items-center justify-center py-10 text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
                </div>
              ) : messages.length === 0 ? (
                <p className="py-10 text-center text-xs text-muted-foreground">
                  No messages yet — say hi!
                </p>
              ) : (
                messages.map((m) => {
                  const mine = user?.id === m.user_id;
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[85%] rounded-lg border px-2.5 py-1.5 ${
                          mine
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-primary/25 bg-secondary/50 text-foreground"
                        }`}
                      >
                        <div className="mb-0.5 flex items-center gap-2">
                          <span className={`text-[11px] font-bold ${mine ? "text-primary-foreground" : "text-sidebar"}`}>
                            {mine ? "You" : m.display_name || "Member"}
                          </span>
                          <span className={`text-[9px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                            {formatTime(m.created_at)}
                          </span>
                          {mine && (
                            <button
                              type="button"
                              onClick={() => handleDelete(m.id)}
                              className="ml-auto opacity-60 hover:opacity-100"
                              aria-label="Delete message"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                        <p className="whitespace-pre-wrap break-words text-xs leading-snug">{m.content}</p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-primary/20 p-2">
              {user ? (
                <form onSubmit={handleSend} className="flex items-center gap-2">
                  <Input
                    value={text}
                    onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
                    placeholder="Write a message..."
                    className="h-9 flex-1 text-sm"
                    maxLength={MAX_LEN}
                  />
                  <Button type="submit" size="sm" className="h-9 px-3" disabled={!text.trim() || sending}>
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </form>
              ) : (
                <Button asChild size="sm" className="w-full font-bold">
                  <Link to="/auth">Sign in to chat</Link>
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default LiveChatDock;
