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
      className="fixed bottom-24 right-3 md:bottom-6 md:right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/40 flex items-center justify-center hover:scale-105 transition-transform"
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