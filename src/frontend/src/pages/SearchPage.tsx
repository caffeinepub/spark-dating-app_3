import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Search, UserCheck, UserPlus, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import type { SearchResult } from "../backend";
import { useActor } from "../hooks/useActor";

// Strip leading @ so both "john" and "@john" find the same results
function normalizeQuery(q: string): string {
  const trimmed = q.trim();
  return trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
}

// Fetch all users (for suggestions when search is empty)
function useAllUsers() {
  const { actor } = useActor();
  return useQuery<SearchResult[]>({
    queryKey: ["allUsersForSearch"],
    queryFn: async () => {
      if (!actor) return [];
      try {
        // searchUsers with empty string returns all users
        const results = await actor.searchUsers("");
        return results;
      } catch (err) {
        console.error("searchUsers (all) error:", err);
        return [];
      }
    },
    enabled: !!actor,
    staleTime: 30_000,
  });
}

function useSearchUsers(rawQuery: string) {
  const { actor } = useActor();
  const query = normalizeQuery(rawQuery);
  return useQuery<SearchResult[]>({
    queryKey: ["searchUsers", query],
    queryFn: async () => {
      if (!actor) return [];
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

function UserRow({
  user,
  isFollowing,
  isLoadingFollow,
  onFollow,
  onUnfollow,
  onClick,
  index,
}: {
  user: SearchResult;
  isFollowing: boolean;
  isLoadingFollow: boolean;
  onFollow: () => void;
  onUnfollow: () => void;
  onClick: () => void;
  index: number;
}) {
  const principalStr = user.principal.toString();
  return (
    <motion.div
      key={principalStr}
      data-ocid={`search.result.item.${index + 1}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="flex items-center gap-3 px-4 py-3 hover:bg-accent/40 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="relative shrink-0">
        <Avatar className="w-11 h-11 ring-2 ring-border">
          <AvatarImage src={user.photoLink} alt={user.displayName} />
          <AvatarFallback className="gradient-primary text-white font-bold text-sm">
            {user.displayName?.charAt(0)?.toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-foreground truncate leading-tight">
          {user.displayName || user.username}
        </p>
        <p className="text-xs text-muted-foreground truncate leading-tight mt-0.5">
          {user.username ? `@${user.username}` : ""}
        </p>
      </div>

      <Button
        data-ocid={`search.follow_button.${index + 1}`}
        size="sm"
        variant={isFollowing ? "outline" : "default"}
        disabled={isLoadingFollow}
        className={
          isFollowing
            ? "h-8 text-xs px-3"
            : "h-8 text-xs px-3 gradient-primary border-0 text-white hover:opacity-90"
        }
        onClick={(e) => {
          e.stopPropagation();
          if (isFollowing) {
            onUnfollow();
          } else {
            onFollow();
          }
        }}
      >
        {isFollowing ? (
          <>
            <UserCheck className="w-3 h-3 mr-1" />
            Following
          </>
        ) : (
          <>
            <UserPlus className="w-3 h-3 mr-1" />
            Follow
          </>
        )}
      </Button>
    </motion.div>
  );
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [_isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: allUsers = [], isLoading: isLoadingAll } = useAllUsers();
  const { data: searchResults = [], isLoading: isLoadingSearch } =
    useSearchUsers(query);
  const { data: following = [] } = useFollowing();
  const { actor } = useActor();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const hasQuery = normalizeQuery(query).length > 0;
  const displayUsers = hasQuery ? searchResults : allUsers;
  const isLoading = hasQuery ? isLoadingSearch : isLoadingAll;

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

  return (
    <div className="min-h-screen bg-background">
      {/* Search Header */}
      <div className="sticky top-0 z-10 glass border-b border-border px-4 py-3">
        <div className="max-w-xl mx-auto relative flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              data-ocid="search.input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Search by name or @username..."
              className="pl-9 pr-9 bg-muted/60 border-transparent rounded-full focus:border-primary transition-all"
              autoFocus
            />
            {query && (
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto">
        {/* Section Label */}
        {!hasQuery && (
          <div className="px-4 pt-4 pb-2">
            <p className="text-sm font-semibold text-foreground">Suggested</p>
          </div>
        )}
        {hasQuery && (
          <div className="px-4 pt-4 pb-2">
            <p className="text-sm text-muted-foreground">
              Results for &ldquo;{query}&rdquo;
            </p>
          </div>
        )}

        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              data-ocid="search.loading_state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-1 pt-1"
            >
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-11 h-11 rounded-full bg-muted animate-pulse" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-muted animate-pulse rounded w-28" />
                    <div className="h-3 bg-muted animate-pulse rounded w-20" />
                  </div>
                  <div className="h-8 w-20 bg-muted animate-pulse rounded-full" />
                </div>
              ))}
            </motion.div>
          ) : displayUsers.length === 0 && hasQuery ? (
            <motion.div
              key="empty"
              data-ocid="search.empty_state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 text-center px-4"
            >
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Search className="w-7 h-7 text-muted-foreground" />
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
              key={hasQuery ? "search-results" : "suggestions"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {displayUsers.map((user, idx) => {
                const principalStr = user.principal.toString();
                const isFollowingUser = following.includes(principalStr);
                const isLoadingFollow =
                  (followMutation.isPending &&
                    followMutation.variables === principalStr) ||
                  (unfollowMutation.isPending &&
                    unfollowMutation.variables === principalStr);

                return (
                  <UserRow
                    key={principalStr}
                    user={user}
                    isFollowing={isFollowingUser}
                    isLoadingFollow={isLoadingFollow}
                    onFollow={() => followMutation.mutate(principalStr)}
                    onUnfollow={() => unfollowMutation.mutate(principalStr)}
                    onClick={() => navigate({ to: `/profile/${principalStr}` })}
                    index={idx}
                  />
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
