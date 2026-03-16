import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Principal } from "@icp-sdk/core/principal";
import {
  Bell,
  Check,
  Flame,
  Heart,
  MessageCircle,
  UserPlus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  useAcceptFollowRequest,
  useDeclineFollowRequest,
  useMarkNotificationRead,
  useNotifications,
  usePendingFollowRequests,
  useUserProfile,
} from "../hooks/useQueries";

function getNotifIcon(message: string) {
  if (message.toLowerCase().includes("match"))
    return <Flame className="w-5 h-5 text-orange-500" />;
  if (message.toLowerCase().includes("like"))
    return <Heart className="w-5 h-5 text-primary" />;
  if (message.toLowerCase().includes("message"))
    return <MessageCircle className="w-5 h-5 text-secondary" />;
  if (message.toLowerCase().includes("follow"))
    return <UserPlus className="w-5 h-5 text-primary" />;
  return <Bell className="w-5 h-5 text-muted-foreground" />;
}

function FollowRequestCard({ requester }: { requester: Principal }) {
  const { data: profile } = useUserProfile(requester);
  const accept = useAcceptFollowRequest();
  const decline = useDeclineFollowRequest();

  const handleAccept = async () => {
    try {
      await accept.mutateAsync(requester);
      toast.success("Follow request accepted!");
    } catch {
      toast.error("Failed to accept request.");
    }
  };

  const handleDecline = async () => {
    try {
      await decline.mutateAsync(requester);
      toast.success("Request declined.");
    } catch {
      toast.error("Failed to decline request.");
    }
  };

  return (
    <div
      data-ocid="notifications.follow_request.card"
      className="flex items-center gap-3 p-4 rounded-2xl border border-primary/20 bg-accent/30"
    >
      <Avatar className="w-12 h-12 ring-2 ring-primary/30 shrink-0">
        <AvatarImage src={profile?.photoLink} />
        <AvatarFallback className="gradient-soft text-white font-bold">
          {profile?.displayName?.charAt(0)?.toUpperCase() ??
            requester.toString().slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate">
          {profile?.displayName ?? `${requester.toString().slice(0, 12)}...`}
        </p>
        <p className="text-xs text-muted-foreground">Wants to follow you</p>
      </div>
      <div className="flex gap-2 shrink-0">
        <Button
          data-ocid="notifications.follow_request.confirm_button"
          size="sm"
          onClick={handleAccept}
          disabled={accept.isPending}
          className="gradient-primary text-white border-0 h-8 px-3 gap-1"
        >
          <Check className="w-3.5 h-3.5" />
          Accept
        </Button>
        <Button
          data-ocid="notifications.follow_request.cancel_button"
          size="sm"
          variant="outline"
          onClick={handleDecline}
          disabled={decline.isPending}
          className="h-8 px-3 gap-1 text-muted-foreground"
        >
          <X className="w-3.5 h-3.5" />
          Decline
        </Button>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const { data: notifications, isLoading } = useNotifications();
  const { data: pendingRequests = [], isLoading: requestsLoading } =
    usePendingFollowRequests();
  const markRead = useMarkNotificationRead();

  const hasPending = pendingRequests.length > 0;

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold mb-1">Notifications</h1>
        <p className="text-muted-foreground">Stay up to date</p>
      </div>

      {/* Follow Requests Section */}
      {(hasPending || requestsLoading) && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <UserPlus className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-sm text-foreground">
              Follow Requests
            </h2>
            {hasPending && (
              <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                {pendingRequests.length}
              </span>
            )}
          </div>
          {requestsLoading ? (
            <div className="space-y-3">
              {["1", "2"].map((k) => (
                <div
                  key={k}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-card"
                >
                  <Skeleton className="w-12 h-12 rounded-full shrink-0" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          ) : (
            <div
              data-ocid="notifications.follow_requests.list"
              className="space-y-2"
            >
              {pendingRequests.map((requester, i) => (
                <div
                  key={requester.toString()}
                  data-ocid={`notifications.follow_request.item.${i + 1}`}
                >
                  <FollowRequestCard requester={requester} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Regular Notifications */}
      {hasPending && <div className="border-t border-border mb-6" />}

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
        !hasPending && (
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
        )
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
