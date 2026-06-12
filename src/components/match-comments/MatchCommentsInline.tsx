import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Send, MoreVertical, Pencil, Trash2, Flag, MessageSquare, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useMatchComments } from "@/hooks/useMatchComments";
import { useAuth } from "@/hooks/useAuth";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface Props {
  matchId: string;
  enabled: boolean;
}

const MAX_LEN = 500;

/**
 * Inline (expand-in-place) comments thread. Used inside match cards on Android.
 * Mirrors the sheet content but renders as an inline section, similar to
 * the AI vs Members "Comment Below" pattern.
 */
export function MatchCommentsInline({ matchId, enabled }: Props) {
  const { user } = useAuth();
  const { isAdmin } = useUserPlan();
  const navigate = useNavigate();
  const { comments, loading, post, edit, remove, report } = useMatchComments(matchId, enabled);

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const listEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (enabled) listEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [comments.length, enabled]);

  const handleSend = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    try {
      await post(text);
      setDraft("");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't send");
    } finally {
      setSending(false);
    }
  };

  const handleSaveEdit = async (id: string) => {
    const text = editDraft.trim();
    if (!text) return;
    try {
      await edit(id, text);
      setEditingId(null);
      setEditDraft("");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't update");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await remove(id);
      toast.success("Comment removed");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't delete");
    }
  };

  const handleReport = async (id: string) => {
    try {
      await report(id);
      toast.success("Reported. Thanks for flagging.");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't report");
    }
  };

  const displayName = (c: typeof comments[number]) => c.username || c.full_name || "User";

  return (
    <div className="border-t border-border/40 bg-muted/5">
      <div className="px-3 py-3 max-h-[320px] overflow-y-auto">
        {loading && comments.length === 0 ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground text-[11px]">
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> Loading…
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-[11px]">
            <MessageSquare className="h-6 w-6 mx-auto mb-1.5 opacity-40" />
            Be the first to comment.
          </div>
        ) : (
          <div className="space-y-2.5">
            {comments.map((c) => {
              const mine = user?.id === c.user_id;
              return (
                <div key={c.id} className={cn("flex gap-2", mine ? "flex-row-reverse" : "flex-row")}>
                  <Avatar className="h-6 w-6 flex-shrink-0">
                    {c.avatar_url && <AvatarImage src={c.avatar_url} />}
                    <AvatarFallback className="text-[9px] bg-secondary">
                      {displayName(c).slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={cn(
                      "max-w-[78%] rounded-2xl px-2.5 py-1.5 text-[11px] leading-snug",
                      mine
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-secondary text-foreground rounded-tl-sm"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className={cn(
                          "text-[9px] font-semibold opacity-80",
                          mine ? "text-primary-foreground" : "text-primary"
                        )}
                      >
                        {mine ? "You" : displayName(c)}
                      </span>
                      <span className="text-[8px] opacity-60">
                        {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                        {c.edited && " · edited"}
                      </span>
                    </div>
                    {editingId === c.id ? (
                      <div className="space-y-1.5">
                        <Textarea
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.target.value.slice(0, MAX_LEN))}
                          className="min-h-[54px] text-[11px] bg-background/50 text-foreground"
                        />
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-[10px]"
                            onClick={() => {
                              setEditingId(null);
                              setEditDraft("");
                            }}
                          >
                            Cancel
                          </Button>
                          <Button size="sm" className="h-6 text-[10px]" onClick={() => handleSaveEdit(c.id)}>
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap break-words">{c.content}</p>
                    )}
                  </div>

                  {editingId !== c.id && (mine || isAdmin || user) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 flex-shrink-0 self-center opacity-60 hover:opacity-100"
                        >
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        {mine && (
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingId(c.id);
                              setEditDraft(c.content);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                          </DropdownMenuItem>
                        )}
                        {(mine || isAdmin) && (
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDelete(c.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                          </DropdownMenuItem>
                        )}
                        {!mine && (
                          <DropdownMenuItem onClick={() => handleReport(c.id)}>
                            <Flag className="h-3.5 w-3.5 mr-2" /> Report
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              );
            })}
            <div ref={listEndRef} />
          </div>
        )}
      </div>

      <div className="border-t border-border/40 px-3 py-2 bg-background/60">
        {user ? (
          <div className="flex items-end gap-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, MAX_LEN))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Share your prediction…"
              className="min-h-[36px] max-h-[100px] text-[11px] resize-none"
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={sending || !draft.trim()}
              className="h-8 w-8 flex-shrink-0"
            >
              {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </Button>
          </div>
        ) : (
          <Button className="w-full h-8 text-[11px]" onClick={() => navigate("/auth")}>
            Sign in to join the chat
          </Button>
        )}
        <div className="text-[8px] text-muted-foreground text-right mt-0.5">
          {draft.length}/{MAX_LEN}
        </div>
      </div>
    </div>
  );
}