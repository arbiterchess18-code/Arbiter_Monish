/**
 * useNotifications
 * ─────────────────────────────────────────────────────────────────
 * Strategy:
 *   1. On mount → fetch last 50 notifications from FastAPI (JWT-secured)
 *   2. Subscribe to Supabase Realtime INSERT events on "notifications" table
 *   3. On each INSERT event → filter by user_id in JS (no Supabase Auth)
 *   4. Prepend new notification to state (no re-fetch needed)
 *   5. On unmount → unsubscribe to prevent memory leaks / duplicate channels
 * ─────────────────────────────────────────────────────────────────
 * Polling is REMOVED. No setInterval.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function getAuthHeaders() {
    const token = sessionStorage.getItem("authToken");
    return {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

/** Read current user_id from sessionStorage (BIGINT stored as number/string) */
function getCurrentUserId() {
    try {
        const userData = JSON.parse(sessionStorage.getItem("userData") || "{}");
        return userData.user_id ? Number(userData.user_id) : null;
    } catch {
        return null;
    }
}

export function useNotifications() {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const channelRef = useRef(null); // prevents duplicate subscriptions

    // ── 1. Initial fetch from FastAPI (all 50, JWT-secured)
    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/notifications`, {
                headers: getAuthHeaders(),
            });
            if (!res.ok) return;
            const data = await res.json();
            setNotifications(data);
            setUnreadCount(data.filter((n) => !n.is_read).length);
        } catch {
            // ignore — user is likely not logged in
        } finally {
            setLoading(false);
        }
    }, []);

    // ── 2. Supabase Realtime subscription
    useEffect(() => {
        const userId = getCurrentUserId();

        // If no user or Supabase not configured, skip realtime
        if (!userId || !supabase) return;

        // Guard: remove old channel before creating a new one
        if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
        }

        const channel = supabase
            .channel(`notifications:user:${userId}`) // unique channel name per user
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "notifications",
                    // Server-side filter (requires Realtime filter support in Supabase)
                    // This is the PRIMARY security layer — only rows matching this
                    // filter are streamed to this client.
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    const newNotif = payload.new;

                    // ── Secondary client-side guard (IDOR defence in depth)
                    // Even if a filter is misconfigured, this ensures we never
                    // display another user's notification.
                    if (Number(newNotif.user_id) !== userId) return;

                    // Prepend to list — no re-fetch needed
                    setNotifications((prev) => {
                        // De-duplicate: ignore if notification_id already in list
                        if (prev.some((n) => n.notification_id === newNotif.notification_id)) {
                            return prev;
                        }
                        return [newNotif, ...prev];
                    });

                    // Increment unread badge (new notifications always arrive unread)
                    setUnreadCount((prev) => prev + 1);
                }
            )
            .subscribe((status) => {
                if (status === "SUBSCRIBED") {
                    console.info("[Realtime] Notification channel subscribed");
                }
                if (status === "CHANNEL_ERROR") {
                    console.error("[Realtime] Notification channel error — check Supabase Realtime settings");
                }
                if (status === "TIMED_OUT") {
                    console.warn("[Realtime] Notification channel timed out — reconnecting...");
                }
            });

        channelRef.current = channel;

        // ── Cleanup: unsubscribe when component unmounts or userId changes
        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
                console.info("[Realtime] Notification channel unsubscribed");
            }
        };
    }, []); // run once on mount — userId is read from sessionStorage (stable)

    // ── 3. Initial data load on mount
    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // ── Mark a single notification as read (optimistic)
    const markRead = useCallback(async (notificationId) => {
        try {
            const res = await fetch(
                `${API_URL}/notifications/${notificationId}/read`,
                { method: "PATCH", headers: getAuthHeaders() }
            );
            if (!res.ok) return;
            setNotifications((prev) =>
                prev.map((n) =>
                    n.notification_id === notificationId ? { ...n, is_read: true } : n
                )
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch {
            // ignore
        }
    }, []);

    // ── Mark ALL as read
    const markAllRead = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/notifications/read-all`, {
                method: "PATCH",
                headers: getAuthHeaders(),
            });
            if (!res.ok) return;
            setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch {
            // ignore
        }
    }, []);

    return {
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markRead,
        markAllRead,
    };
}
