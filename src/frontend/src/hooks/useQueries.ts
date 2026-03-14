import type { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Interest, Profile } from "../backend.d";
import { useActor } from "./useActor";

// Shared stale times to reduce redundant backend calls
const STALE_MEDIUM = 60_000; // 1 min
const STALE_SHORT = 15_000; // 15 sec

export function useUserProfile(principal: Principal | null) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["profile", principal?.toString()],
    queryFn: async () => {
      if (!actor || !principal) return null;
      return actor.getUserProfile(principal);
    },
    enabled: !!actor && !isFetching && !!principal,
    staleTime: STALE_MEDIUM,
  });
}

export function useMyProfile() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["myProfile"],
    queryFn: async () => {
      if (!actor) return null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (actor as any).getMyProfile() as Promise<Profile | null>;
    },
    enabled: !!actor && !isFetching,
    staleTime: STALE_MEDIUM,
  });
}

export function useDiscoverProfiles() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["discoverProfiles"],
    queryFn: async (): Promise<{
      profiles: Profile[];
      whoILiked: Principal[];
      following: Principal[];
    }> => {
      if (!actor) return { profiles: [], whoILiked: [], following: [] };
      // Fetch all profiles + social data in parallel
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [allProfiles, whoILiked, following] = await Promise.all([
        (actor as any).getAllProfiles() as Promise<Profile[]>,
        actor.getWhoILiked().catch(() => [] as Principal[]),
        actor.getFollowing().catch(() => [] as Principal[]),
      ]);
      return { profiles: allProfiles, whoILiked, following };
    },
    enabled: !!actor && !isFetching,
    staleTime: STALE_SHORT,
  });
}

export function useMatches() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["matches"],
    queryFn: async () => {
      if (!actor) return [];
      const [whoILiked, whoLikedMe] = await Promise.all([
        actor.getWhoILiked(),
        actor.getWhoLikedMe(),
      ]);
      const likedSet = new Set(whoILiked.map((p) => p.toString()));
      const matchPrincipals = whoLikedMe.filter((p) =>
        likedSet.has(p.toString()),
      );
      if (matchPrincipals.length === 0) return [];
      const profiles = await Promise.all(
        matchPrincipals.map((p) => actor.getUserProfile(p).catch(() => null)),
      );
      return profiles.filter((p): p is Profile => p !== null);
    },
    enabled: !!actor && !isFetching,
    staleTime: STALE_SHORT,
  });
}

export function useConversations() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      if (!actor) return [];
      const convs = await actor.getAllConversations();
      const withProfiles = await Promise.all(
        convs.map(async ([principal, messages]) => {
          const profile = await actor
            .getUserProfile(principal)
            .catch(() => null);
          return { principal, messages, profile };
        }),
      );
      return withProfiles;
    },
    enabled: !!actor && !isFetching,
    staleTime: STALE_SHORT,
  });
}

export function useChat(otherUser: Principal | null) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["chat", otherUser?.toString()],
    queryFn: async () => {
      if (!actor || !otherUser) return [];
      return actor.getConversationsWithUser(otherUser);
    },
    enabled: !!actor && !isFetching && !!otherUser,
    refetchInterval: 5000,
    staleTime: 2000,
  });
}

export function useNotifications() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getNotifications();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 20000,
    staleTime: 10000,
  });
}

export function useUnreadCount() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["unreadCount"],
    queryFn: async () => {
      if (!actor) return 0n;
      return actor.getUnreadNotificationCount();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 20000,
    staleTime: 10000,
  });
}

export function useWhoILiked() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["whoILiked"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getWhoILiked();
    },
    enabled: !!actor && !isFetching,
    staleTime: STALE_SHORT,
  });
}

export function useFollowing() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["following"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getFollowing();
    },
    enabled: !!actor && !isFetching,
    staleTime: STALE_SHORT,
  });
}

export function useIsAdmin() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["isAdmin"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching,
    staleTime: STALE_MEDIUM,
  });
}

export function useUserCount() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["userCount"],
    queryFn: async () => {
      if (!actor) return 0n;
      return actor.getUserCount();
    },
    enabled: !!actor && !isFetching,
    staleTime: STALE_MEDIUM,
  });
}

export function useSendMessage() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      recipient,
      content,
    }: { recipient: Principal; content: string }) => {
      if (!actor) throw new Error("Not connected");
      return actor.sendMessage(recipient, content);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["chat", vars.recipient.toString()] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useLikeUser() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (principal: Principal) => {
      if (!actor) throw new Error("Not connected");
      return actor.likeUser(principal);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whoILiked"] });
      qc.invalidateQueries({ queryKey: ["matches"] });
      qc.invalidateQueries({ queryKey: ["discoverProfiles"] });
    },
  });
}

export function useUnlikeUser() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (principal: Principal) => {
      if (!actor) throw new Error("Not connected");
      return actor.unlikeUser(principal);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whoILiked"] });
      qc.invalidateQueries({ queryKey: ["matches"] });
      qc.invalidateQueries({ queryKey: ["discoverProfiles"] });
    },
  });
}

export function useFollowUser() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (principal: Principal) => {
      if (!actor) throw new Error("Not connected");
      return actor.followUser(principal);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["following"] });
      qc.invalidateQueries({ queryKey: ["discoverProfiles"] });
    },
  });
}

export function useUnfollowUser() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (principal: Principal) => {
      if (!actor) throw new Error("Not connected");
      return actor.unfollowUser(principal);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["following"] });
      qc.invalidateQueries({ queryKey: ["discoverProfiles"] });
    },
  });
}

export function useMarkNotificationRead() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (timestamp: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.markNotificationAsRead(timestamp);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["unreadCount"] });
    },
  });
}

export function useSaveProfile() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (profile: Profile) => {
      if (!actor) throw new Error("Not connected");
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myProfile"] });
    },
  });
}

export function useFillSampleData() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Not connected");
      return actor.fillSampleData();
    },
    onSuccess: () => {
      qc.invalidateQueries();
    },
  });
}

export function useInterestParser() {
  return (interests: Interest[]): string[] => interests.map((i) => i.name);
}
