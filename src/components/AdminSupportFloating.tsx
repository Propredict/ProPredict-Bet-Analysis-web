import { Link, useLocation } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useAdminSupportUnread } from "@/hooks/useAdminSupportUnread";

/**
 * Floating shortcut for admins — visible on every page (except the inbox itself)
 * so we can spot new support messages instantly.
 */
export function AdminSupportFloating() {
  const { isAdmin, isLoading } = useAdminAccess();
  const unread = useAdminSupportUnread();
  const { pathname } = useLocation();

  if (isLoading || !isAdmin) return null;
  if (pathname.startsWith("/admin/support")) return null;

  return (
    <Link
      to="/admin/support"
      aria-label={`Support inbox${unread > 0 ? ` — ${unread} unread` : ""}`}
      className="fixed bottom-[9rem] right-4 md:bottom-[5.25rem] md:right-4 z-50 h-9 w-9 md:h-10 md:w-10 rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/40 flex items-center justify-center hover:scale-105 transition-transform"
    >
      <MessageCircle className="h-5 w-5" />
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 h-6 min-w-[24px] px-1.5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center shadow animate-pulse">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}