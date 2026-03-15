import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Search, UserCheck, UserPlus, Users } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import type { Profile } from "../backend";
import { useActor } from "../hooks/useActor";

function useAllProfiles() {
  const { actor } = useActor();
  return useQuery<Profile[]>({
    queryKey: ["allProfiles"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllProfiles();
    },
    enabled: !!actor,
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
  const { data: profiles = [] } = useAllProfiles();
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

  const filtered = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return profiles.filter(
      (p) =>
        p.displayName.toLowerCase().includes(q) ||
        p.principal.toString().toLowerCase().includes(q),
    );
  }, [profiles, query]);

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
            placeholder="Search people..."
            className="pl-9 bg-muted/50 border-border rounded-full"
            autoFocus
          />
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-4">
        <AnimatePresence mode="wait">
          {!query.trim() ? (
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
                Find friends by name or username
              </p>
            </motion.div>
          ) : filtered.length === 0 ? (
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
                No results for "{query}"
              </p>
              <p className="text-muted-foreground text-sm mt-1">
                Try a different name
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
              {filtered.map((profile, idx) => {
                const principalStr = profile.principal.toString();
                const isFollowing = following.includes(principalStr);
                const isLoading =
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
                        src={profile.photoLink}
                        alt={profile.displayName}
                      />
                      <AvatarFallback className="gradient-primary text-white font-semibold">
                        {profile.displayName?.charAt(0)?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">
                        {profile.displayName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {principalStr.slice(0, 20)}...
                      </p>
                    </div>

                    <Button
                      data-ocid={`search.follow_button.${idx + 1}`}
                      size="sm"
                      variant={isFollowing ? "outline" : "default"}
                      disabled={isLoading}
                      className={
                        isFollowing
                          ? ""
                          : "gradient-primary border-0 text-white hover:opacity-90"
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isFollowing) {
                          unfollowMutation.mutate(principalStr);
                        } else {
                          followMutation.mutate(principalStr);
                        }
                      }}
                    >
                      {isFollowing ? (
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
