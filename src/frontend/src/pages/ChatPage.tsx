import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Principal } from "@icp-sdk/core/principal";
import { useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, Send } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useChat, useSendMessage, useUserProfile } from "../hooks/useQueries";

export default function ChatPage() {
  const { userId } = useParams({ from: "/layout/messages/$userId" });
  const navigate = useNavigate();
  const { identity } = useInternetIdentity();
  const [message, setMessage] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const otherPrincipal = useMemo(() => {
    if (!userId) return null;
    try {
      return Principal.fromText(userId);
    } catch {
      return null;
    }
  }, [userId]);

  const { data: messages, isLoading } = useChat(otherPrincipal);
  const { data: profile } = useUserProfile(otherPrincipal);
  const sendMessage = useSendMessage();

  const myPrincipal = identity?.getPrincipal()?.toString() ?? "";

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || !otherPrincipal) return;
    const content = message.trim();
    setMessage("");
    sendMessage.mutate({ recipient: otherPrincipal, content });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-[calc(100vh-4rem)]">
      <div className="glass border-b border-border px-4 py-3 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: "/messages" })}
          className="shrink-0"
          data-ocid="chat.back_button"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="w-10 h-10 rounded-full gradient-soft flex items-center justify-center overflow-hidden shrink-0">
          {profile?.photoLink ? (
            <img
              src={profile.photoLink}
              alt={profile.displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="font-display text-lg text-primary">
              {profile?.displayName?.charAt(0).toUpperCase() ?? "?"}
            </span>
          )}
        </div>
        <div>
          <p className="font-semibold">
            {profile?.displayName ?? "Loading..."}
          </p>
          <p className="text-xs text-muted-foreground">
            {profile?.isActive ? "Active now" : "Offline"}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {isLoading ? (
          <div data-ocid="messages.loading_state" className="space-y-3">
            {["1", "2", "3", "4"].map((k) => (
              <div
                key={k}
                className={cn(
                  "flex",
                  Number(k) % 2 === 0 ? "justify-start" : "justify-end",
                )}
              >
                <Skeleton className="h-10 w-48 rounded-2xl" />
              </div>
            ))}
          </div>
        ) : !messages || messages.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No messages yet. Say hello! 👋</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMine = msg.from?.toString() === myPrincipal;
            return (
              <div
                key={msg.timestamp?.toString() ?? `msg-${i}`}
                className={cn("flex", isMine ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[70%] px-4 py-2.5 rounded-2xl text-sm shadow-xs",
                    isMine
                      ? "gradient-primary text-white rounded-br-sm"
                      : "bg-card border border-border text-foreground rounded-bl-sm",
                  )}
                >
                  {msg.content}
                  <div
                    className={cn(
                      "text-xs mt-1 opacity-60",
                      isMine ? "text-right" : "",
                    )}
                  >
                    {new Date(
                      Number(msg.timestamp) / 1_000_000,
                    ).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="glass border-t border-border px-4 py-3 flex items-center gap-3">
        <Input
          data-ocid="messages.input"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <Button
          data-ocid="messages.send_button"
          onClick={handleSend}
          disabled={!message.trim() || sendMessage.isPending}
          className="gradient-primary text-white border-0 shrink-0"
          size="icon"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
