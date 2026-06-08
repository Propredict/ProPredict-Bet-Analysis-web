import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  matchLabel?: string;
}

const MAX_LEN = 500;

export function MatchCommentsSheet({
  open,
  onOpenChange,
  matchId,
  homeTeam,
  awayTeam,
  matchLabel,
}: Props) {
  const { user } = useAuth();
  const { isAdmin } = useUserPlan();
  const navigate = useNavigate();
  const { comments, loading, post, edit, remove, report } = useMatchComments(matchId, open);

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const listEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) listEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments.length, open]);

  const handleSend = async () => {
    if (!user) {
      onOpenChange(false);
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

  const displayName = (c: typeof comments[number]) =>
    c.username || c.full_name || "User";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[85vh] max-h-[85vh] flex flex-col p-0 gap-0 border-t border-primary/20"
      >
        <SheetHeader className="px-4 py-3 border-b border-border/60 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
          <SheetTitle className="text-sm sm:text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            <span className="truncate">
              {homeTeam} vs {awayTeam}
            </span>
            {matchLabel && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {matchLabel}
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 px-3 py-3">
          {loading && comments.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground text-xs">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading comments…
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-xs">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
              Be the first to comment on this match.
            </div>
          ) : (
            <div className="space-y-3">
              {comments.map((c) => {
                const mine = user?.id === c.user_id;
                return (
                  <div
                    key={c.id}
                    className={cn(
                      "flex gap-2",
                      mine ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    <Avatar className="h-7 w-7 flex-shrink-0">
                      {c.avatar_url && <AvatarImage src={c.avatar_url} />}
                      <AvatarFallback className="text-[10px] bg-secondary">
                        {displayName(c).slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={cn(
                        "max-w-[78%] rounded-2xl px-3 py-2 text-[12px] leading-snug",
                        mine
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : "bg-secondary text-foreground rounded-tl-sm"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <span
                          className={cn(
                            "text-[10px] font-semibold opacity-80",
                            mine ? "text-primary-foreground" : "text-primary"
                          )}
                        >
                          {mine ? "You" : displayName(c)}
                        </span>
                        <span className="text-[9px] opacity-60">
                          {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                          {c.edited && " · edited"}
                        </span>
                      </div>
                      {editingId === c.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editDraft}
                            onChange={(e) => setEditDraft(e.target.value.slice(0, MAX_LEN))}
                            className="min-h-[60px] text-[12px] bg-background/50 text-foreground"
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
                            <Button
                              size="sm"
                              className="h-6 text-[10px]"
                              onClick={() => handleSaveEdit(c.id)}
                            >
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
        </ScrollArea>

        <div className="border-t border-border/60 bg-background/95 backdrop-blur px-3 py-2 pb-[max(env(safe-area-inset-bottom),0.5rem)]">
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
                placeholder="Share your prediction or reaction…"
                className="min-h-[40px] max-h-[120px] text-[12px] resize-none"
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={sending || !draft.trim()}
                className="h-9 w-9 flex-shrink-0"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          ) : (
            <Button
              className="w-full h-9 text-xs"
              onClick={() => {
                onOpenChange(false);
                navigate("/auth");
              }}
            >
              Sign in to join the chat
            </Button>
          )}
          <div className="text-[9px] text-muted-foreground text-right mt-1">
            {draft.length}/{MAX_LEN}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}