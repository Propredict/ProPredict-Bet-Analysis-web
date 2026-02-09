import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useArenaNotifications } from "@/hooks/useArenaNotifications";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Trophy, XCircle, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function ArenaNotificationsDropdown() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useArenaNotifications();

  if (!user) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case "win": return <Trophy className="h-3.5 w-3.5 text-success shrink-0" />;
      case "loss": return <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />;
      case "ft": return <Clock className="h-3.5 w-3.5 text-primary shrink-0" />;
      default: return <Bell className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative h-7 w-7 sm:h-8 sm:w-8 border-primary-foreground/30 bg-transparent hover:bg-primary-foreground/10 text-primary-foreground"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 max-h-80 overflow-y-auto bg-popover border-border z-[60]">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/40">
          <span className="text-xs font-semibold text-foreground">Arena Notifications</span>
          {unreadCount > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); markAllAsRead(); }}
              className="text-[10px] text-primary hover:text-primary/80 underline"
            >
              Mark all read
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <Bell className="h-5 w-5 mx-auto text-muted-foreground/40 mb-1.5" />
            <p className="text-[10px] text-muted-foreground">No notifications yet</p>
          </div>
        ) : (
          notifications.slice(0, 15).map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className={cn(
                "flex items-start gap-2.5 px-3 py-2.5 cursor-pointer",
                !notification.is_read && "bg-primary/5"
              )}
              onClick={() => {
                if (!notification.is_read) markAsRead(notification.id);
                navigate("/ai-vs-community");
              }}
            >
              <div className="mt-0.5">{getIcon(notification.type)}</div>
              <div className="flex-1 min-w-0 space-y-0.5">
                <p className={cn("text-[11px] leading-tight", !notification.is_read ? "font-semibold text-foreground" : "text-muted-foreground")}>
                  {notification.title}
                </p>
                <p className="text-[9px] text-muted-foreground leading-relaxed line-clamp-2">
                  {notification.message}
                </p>
                <p className="text-[8px] text-muted-foreground/50">
                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                </p>
              </div>
              {!notification.is_read && (
                <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />
              )}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
