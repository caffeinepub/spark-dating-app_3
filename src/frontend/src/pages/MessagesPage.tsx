import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { useConversations } from "../hooks/useQueries";

export default function MessagesPage() {
  const navigate = useNavigate();
  const { data: conversations, isLoading } = useConversations();

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold mb-1">Messages</h1>
        <p className="text-muted-foreground">Your conversations</p>
      </div>

      {isLoading ? (
        <div data-ocid="messages.loading_state" className="space-y-3">
          {["1", "2", "3", "4"].map((k) => (
            <div
              key={k}
              className="flex items-center gap-3 p-4 rounded-2xl bg-card"
            >
              <Skeleton className="w-12 h-12 rounded-full shrink-0" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </div>
      ) : !conversations || conversations.length === 0 ? (
        <div data-ocid="messages.empty_state" className="text-center py-24">
          <div className="w-20 h-20 mx-auto gradient-soft rounded-full flex items-center justify-center mb-4">
            <MessageCircle className="w-10 h-10 text-primary" />
          </div>
          <h3 className="font-display text-xl font-semibold mb-2">
            No messages yet
          </h3>
          <p className="text-muted-foreground mb-4">
            Match with someone to start a conversation!
          </p>
          <Button
            onClick={() => navigate({ to: "/matches" })}
            className="gradient-primary text-white border-0"
          >
            See Matches
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map(({ principal, messages, profile }, i) => {
            const lastMsg = messages[messages.length - 1];
            const unreadCount = messages.filter((m) => !m.isRead).length;
            const principalStr = principal?.toString() ?? "";
            return (
              <button
                type="button"
                key={principalStr}
                data-ocid={`messages.item.${i + 1}`}
                className="flex w-full text-left items-center gap-3 p-4 rounded-2xl bg-card border border-border shadow-card cursor-pointer hover:shadow-card-hover transition-all"
                onClick={() => navigate({ to: `/messages/${principalStr}` })}
              >
                <div className="relative shrink-0">
                  <div className="w-12 h-12 rounded-full gradient-soft flex items-center justify-center overflow-hidden">
                    {profile?.photoLink ? (
                      <img
                        src={profile.photoLink}
                        alt={profile.displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="font-display text-xl text-primary">
                        {profile?.displayName?.charAt(0).toUpperCase() ?? "?"}
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full gradient-primary text-white text-xs flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">
                    {profile?.displayName ?? `${principalStr.slice(0, 12)}...`}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {lastMsg?.content ?? "Start a conversation"}
                  </p>
                </div>
                {lastMsg && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(
                      Number(lastMsg.timestamp) / 1_000_000,
                    ).toLocaleDateString()}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
