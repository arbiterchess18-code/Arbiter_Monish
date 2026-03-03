import { useState, useCallback } from "react";
import { Bell, Check, CheckCheck, X } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const TYPE_ICONS = {
    RESULT_UPDATE: "♟️",
    ROUND_PAIRING: "🏆",
    REGISTRATION_APPROVED: "✅",
    REGISTRATION_REJECTED: "❌",
};

function formatTime(ts) {
    const d = new Date(ts);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return d.toLocaleDateString();
}

export function NotificationBell() {
    const [open, setOpen] = useState(false);
    const { notifications, unreadCount, loading, markRead, markAllRead } =
        useNotifications();

    const handleOpen = useCallback(() => {
        setOpen((prev) => !prev);
    }, []);

    return (
        <div className="relative">
            {/* ── Bell button with badge */}
            <Button
                variant="ghost"
                size="icon"
                onClick={handleOpen}
                className="relative h-8 w-8 text-muted-foreground hover:text-foreground"
                title="Notifications"
            >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                )}
            </Button>

            {/* ── Dropdown panel */}
            {open && (
                <>
                    {/* backdrop */}
                    <div
                        className="fixed inset-0 z-30"
                        onClick={() => setOpen(false)}
                    />

                    <div className="absolute right-0 top-10 z-40 w-80 rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/80">
                            <div className="flex items-center gap-2">
                                <Bell className="h-4 w-4 text-primary" />
                                <span className="font-semibold text-sm">Notifications</span>
                                {unreadCount > 0 && (
                                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
                                        {unreadCount}
                                    </Badge>
                                )}
                            </div>
                            <div className="flex items-center gap-1">
                                {unreadCount > 0 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 text-xs px-2 text-muted-foreground hover:text-foreground"
                                        onClick={markAllRead}
                                        title="Mark all as read"
                                    >
                                        <CheckCheck className="h-3 w-3 mr-1" />
                                        All read
                                    </Button>
                                )}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => setOpen(false)}
                                >
                                    <X className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>

                        {/* List */}
                        <div className="max-h-96 overflow-y-auto divide-y divide-border">
                            {loading ? (
                                <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                                    Loading…
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                                    <Bell className="h-8 w-8 opacity-30" />
                                    <span className="text-sm">No notifications yet</span>
                                </div>
                            ) : (
                                notifications.map((n) => (
                                    <button
                                        key={n.notification_id}
                                        onClick={() => !n.is_read && markRead(n.notification_id)}
                                        className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors group ${n.is_read ? "opacity-60" : "bg-primary/5"
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <span className="text-lg mt-0.5 shrink-0">
                                                {TYPE_ICONS[n.type] ?? "🔔"}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs text-foreground leading-snug">
                                                    {n.message}
                                                </p>
                                                <p className="text-[11px] text-muted-foreground mt-1">
                                                    {formatTime(n.created_at)}
                                                </p>
                                            </div>
                                            {!n.is_read && (
                                                <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                                            )}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
