import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Bell, Flame, Heart, MessageCircle } from "lucide-react";
import { useMarkNotificationRead, useNotifications } from "../hooks/useQueries";

function getNotifIcon(message: string) {
  if (message.toLowerCase().includes("match"))
    return <Flame className="w-5 h-5 text-orange-500" />;
  if (message.toLowerCase().includes("like"))
    return <Heart className="w-5 h-5 text-primary" />;
  if (message.toLowerCase().includes("message"))
    return <MessageCircle className="w-5 h-5 text-secondary" />;
  return <Bell className="w-5 h-5 text-muted-foreground" />;
}

export default function NotificationsPage() {
  const { data: notifications, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold mb-1">Notifications</h1>
        <p className="text-muted-foreground">Stay up to date</p>
      </div>

      {isLoading ? (
        <div data-ocid="notifications.loading_state" className="space-y-3">
          {["1", "2", "3", "4", "5"].map((k) => (
            <div
              key={k}
              className="flex items-start gap-3 p-4 rounded-2xl bg-card"
            >
              <Skeleton className="w-10 h-10 rounded-full shrink-0" />
              <div className="flex-1">
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : !notifications || notifications.length === 0 ? (
        <div
          data-ocid="notifications.empty_state"
          className="text-center py-24"
        >
          <div className="w-20 h-20 mx-auto gradient-soft rounded-full flex items-center justify-center mb-4">
            <Bell className="w-10 h-10 text-primary" />
          </div>
          <h3 className="font-display text-xl font-semibold mb-2">
            All caught up!
          </h3>
          <p className="text-muted-foreground">
            No notifications yet. Start connecting with people!
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif, i) => (
            <div
              key={notif.timestamp.toString()}
              data-ocid={`notifications.item.${i + 1}`}
              className={cn(
                "flex items-start gap-3 p-4 rounded-2xl border transition-all",
                notif.isRead
                  ? "bg-card border-border"
                  : "bg-accent/50 border-primary/20 shadow-xs",
              )}
            >
              <div className="w-10 h-10 rounded-full gradient-soft flex items-center justify-center shrink-0">
                {getNotifIcon(notif.message)}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm", !notif.isRead && "font-medium")}>
                  {notif.message}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(
                    Number(notif.timestamp) / 1_000_000,
                  ).toLocaleString()}
                </p>
              </div>
              {!notif.isRead && (
                <Button
                  data-ocid={`notifications.mark_read_button.${i + 1}`}
                  variant="ghost"
                  size="sm"
                  onClick={() => markRead.mutate(notif.timestamp)}
                  className="text-xs text-primary shrink-0"
                >
                  Mark read
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
