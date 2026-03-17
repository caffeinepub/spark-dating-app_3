import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Search, UserCheck, UserPlus, Users } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import type { SearchResult } from "../backend";
import { useActor } from "../hooks/useActor";

// Strip leading @ so both "john" and "@john" find the same results
function normalizeQuery(q: string): string {
  const trimmed = q.trim();
  return trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
}

function useSearchUsers(rawQuery: string) {
  const { actor } = useActor();
  const query = normalizeQuery(rawQuery);
  return useQuery<SearchResult[]>({
    queryKey: ["searchUsers", query],
    queryFn: async () => {
      if (!actor || !query) return [];
      try {
        const results = await actor.searchUsers(query);
        return results;
      } catch (err) {
        console.error("searchUsers error:", err);
        return [];
      }
    },
    enabled: !!actor && query.length > 0,
    staleTime: 1000,
  });
}

function useFollowing() {
  const { actor } = useActor();
  return useQuery<string[]>({
    queryKey: ["myFollowing"],
    queryFn: async () => {
      if (!actor) return [];
      const list = await actor.getFollowing();
      return list.map((p) => p.toString());
    },
    enabled: !!actor,
  });
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const { data: results = [], isLoading } = useSearchUsers(query);
  const { data: following = [] } = useFollowing();
  const { actor } = useActor();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const followMutation = useMutation({
    mutationFn: async (principal: string) => {
      if (!actor) throw new Error("Not connected");
      const { Principal } = await import("@icp-sdk/core/principal");
      await actor.followUser(Principal.fromText(principal));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["myFollowing"] }),
  });

  const unfollowMutation = useMutation({
    mutationFn: async (principal: string) => {
      if (!actor) throw new Error("Not connected");
      const { Principal } = await import("@icp-sdk/core/principal");
      await actor.unfollowUser(Principal.fromText(principal));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["myFollowing"] }),
  });

  const hasQuery = query.trim().length > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 glass border-b border-border px-4 py-3">
        <div className="max-w-xl mx-auto relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            data-ocid="search.input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or @username..."
            className="pl-9 bg-muted/50 border-border rounded-full"
            autoFocus
          />
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-4">
        <AnimatePresence mode="wait">
          {!hasQuery ? (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center mb-4">
                <Search className="w-7 h-7 text-white" />
              </div>
              <p className="text-foreground font-semibold text-lg">
                Search for people
              </p>
              <p className="text-muted-foreground text-sm mt-1">
                Find friends by name or @username
              </p>
            </motion.div>
          ) : isLoading ? (
            <motion.div
              key="loading"
              data-ocid="search.loading_state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-center py-12"
            >
              <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </motion.div>
          ) : results.length === 0 ? (
            <motion.div
              key="empty"
              data-ocid="search.empty_state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Users className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-foreground font-semibold">
                No results for &ldquo;{query}&rdquo;
              </p>
              <p className="text-muted-foreground text-sm mt-1">
                Try a different name or @username
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-2"
            >
              {results.map((user, idx) => {
                const principalStr = user.principal.toString();
                const isFollowingUser = following.includes(principalStr);
                const isLoadingFollow =
                  (followMutation.isPending &&
                    followMutation.variables === principalStr) ||
                  (unfollowMutation.isPending &&
                    unfollowMutation.variables === principalStr);

                return (
                  <motion.div
                    key={principalStr}
                    data-ocid={`search.result.item.${idx + 1}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => navigate({ to: `/profile/${principalStr}` })}
                  >
                    <Avatar className="w-12 h-12 shrink-0">
                      <AvatarImage
                        src={user.photoLink}
                        alt={user.displayName}
                      />
                      <AvatarFallback className="gradient-primary text-white font-semibold">
                        {user.displayName?.charAt(0)?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">
                        {user.displayName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.username ? `@${user.username}` : ""}
                      </p>
                    </div>

                    <Button
                      data-ocid={`search.follow_button.${idx + 1}`}
                      size="sm"
                      variant={isFollowingUser ? "outline" : "default"}
                      disabled={isLoadingFollow}
                      className={
                        isFollowingUser
                          ? ""
                          : "gradient-primary border-0 text-white hover:opacity-90"
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isFollowingUser) {
                          unfollowMutation.mutate(principalStr);
                        } else {
                          followMutation.mutate(principalStr);
                        }
                      }}
                    >
                      {isFollowingUser ? (
                        <>
                          <UserCheck className="w-3.5 h-3.5 mr-1" />
                          Following
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3.5 h-3.5 mr-1" />
                          Follow
                        </>
                      )}
                    </Button>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
