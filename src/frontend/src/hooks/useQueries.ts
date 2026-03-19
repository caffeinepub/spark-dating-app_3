import type { Principal } from "@icp-sdk/core/principal";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  Comment,
  Interest,
  Post,
  Profile,
  Reel,
  Story,
} from "../backend.d";
import { FollowRequestStatus } from "../backend.d";
import { useActor } from "./useActor";

// Shared stale times to reduce redundant backend calls
const STALE_MEDIUM = 60_000; // 1 min
const STALE_SHORT = 15_000; // 15 sec

export function useUserProfile(principal: Principal | null) {
  const { actor } = useActor();
  return useQuery({
    queryKey: ["profile", principal?.toString()],
    queryFn: async () => {
      if (!actor || !principal) return null;
      return actor.getUserProfile(principal);
    },
    enabled: !!actor && !!principal,
    staleTime: STALE_MEDIUM,
    placeholderData: keepPreviousData,
  });
}

export function useMyProfile() {
  const { actor } = useActor();
  return useQuery({
    queryKey: ["myProfile"],
    queryFn: async () => {
      if (!actor) return null;
      return (actor as any).getMyProfile() as Promise<Profile | null>;
    },
    enabled: !!actor,
    staleTime: STALE_MEDIUM,
    placeholderData: keepPreviousData,
  });
}

export function useDiscoverProfiles() {
  const { actor } = useActor();
  return useQuery({
    queryKey: ["discoverProfiles"],
    queryFn: async (): Promise<{
      profiles: Profile[];
      whoILiked: Principal[];
      following: Principal[];
    }> => {
      if (!actor) return { profiles: [], whoILiked: [], following: [] };
      const [allProfiles, whoILiked, following] = await Promise.all([
        (actor as any).getAllProfiles() as Promise<Profile[]>,
        actor.getWhoILiked().catch(() => [] as Principal[]),
        actor.getFollowing().catch(() => [] as Principal[]),
      ]);
      return { profiles: allProfiles, whoILiked, following };
    },
    enabled: !!actor,
    staleTime: STALE_SHORT,
    placeholderData: keepPreviousData,
  });
}

export function useMatches() {
  const { actor } = useActor();
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
    enabled: !!actor,
    staleTime: STALE_SHORT,
    placeholderData: keepPreviousData,
  });
}

export function useConversations() {
  const { actor } = useActor();
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
    enabled: !!actor,
    staleTime: STALE_SHORT,
    placeholderData: keepPreviousData,
  });
}

export function useChat(otherUser: Principal | null) {
  const { actor } = useActor();
  return useQuery({
    queryKey: ["chat", otherUser?.toString()],
    queryFn: async () => {
      if (!actor || !otherUser) return [];
      return actor.getConversationsWithUser(otherUser);
    },
    enabled: !!actor && !!otherUser,
    refetchInterval: 5000,
    staleTime: 2000,
  });
}

export function useNotifications() {
  const { actor } = useActor();
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getNotifications();
    },
    enabled: !!actor,
    refetchInterval: 20000,
    staleTime: 10000,
    placeholderData: keepPreviousData,
  });
}

export function useUnreadCount() {
  const { actor } = useActor();
  return useQuery({
    queryKey: ["unreadCount"],
    queryFn: async () => {
      if (!actor) return 0n;
      return actor.getUnreadNotificationCount();
    },
    enabled: !!actor,
    refetchInterval: 20000,
    staleTime: 10000,
  });
}

export function useWhoILiked() {
  const { actor } = useActor();
  return useQuery({
    queryKey: ["whoILiked"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getWhoILiked();
    },
    enabled: !!actor,
    staleTime: STALE_SHORT,
  });
}

export function useFollowing() {
  const { actor } = useActor();
  return useQuery({
    queryKey: ["following"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getFollowing();
    },
    enabled: !!actor,
    staleTime: STALE_SHORT,
  });
}

export function useFollowers() {
  const { actor } = useActor();
  return useQuery({
    queryKey: ["followers"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getFollowers();
    },
    enabled: !!actor,
    staleTime: STALE_SHORT,
  });
}

export function useFollowerCount() {
  const { actor } = useActor();
  return useQuery({
    queryKey: ["followerCount"],
    queryFn: async () => {
      if (!actor) return 0n;
      return actor.getFollowerCount();
    },
    enabled: !!actor,
    staleTime: STALE_SHORT,
  });
}

export function useFollowingCount() {
  const { actor } = useActor();
  return useQuery({
    queryKey: ["followingCount"],
    queryFn: async () => {
      if (!actor) return 0n;
      return actor.getFollowingCount();
    },
    enabled: !!actor,
    staleTime: STALE_SHORT,
  });
}

export function usePendingFollowRequests() {
  const { actor } = useActor();
  return useQuery({
    queryKey: ["pendingFollowRequests"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPendingFollowRequests();
    },
    enabled: !!actor,
    refetchInterval: 20000,
    staleTime: 10000,
    placeholderData: keepPreviousData,
  });
}

export function useFollowRequestStatus(targetUser: Principal | null) {
  const { actor } = useActor();
  return useQuery({
    queryKey: ["followRequestStatus", targetUser?.toString()],
    queryFn: async () => {
      if (!actor || !targetUser) return null;
      return actor.getFollowRequestStatus(targetUser);
    },
    enabled: !!actor && !!targetUser,
    staleTime: STALE_SHORT,
  });
}

export function useIsAdmin() {
  const { actor } = useActor();
  return useQuery({
    queryKey: ["isAdmin"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor,
    staleTime: STALE_MEDIUM,
  });
}

export function useUserCount() {
  const { actor } = useActor();
  return useQuery({
    queryKey: ["userCount"],
    queryFn: async () => {
      if (!actor) return 0n;
      return actor.getUserCount();
    },
    enabled: !!actor,
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
      qc.invalidateQueries({ queryKey: ["followingCount"] });
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
      qc.invalidateQueries({ queryKey: ["followingCount"] });
      qc.invalidateQueries({ queryKey: ["discoverProfiles"] });
    },
  });
}

export function useSendFollowRequest() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (targetUser: Principal) => {
      if (!actor) throw new Error("Not connected");
      return actor.sendFollowRequest(targetUser);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({
        queryKey: ["followRequestStatus", vars.toString()],
      });
    },
  });
}

export function useAcceptFollowRequest() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (requester: Principal) => {
      if (!actor) throw new Error("Not connected");
      return actor.acceptFollowRequest(requester);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pendingFollowRequests"] });
      qc.invalidateQueries({ queryKey: ["followers"] });
      qc.invalidateQueries({ queryKey: ["followerCount"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["unreadCount"] });
    },
  });
}

export function useDeclineFollowRequest() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (requester: Principal) => {
      if (!actor) throw new Error("Not connected");
      return actor.declineFollowRequest(requester);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pendingFollowRequests"] });
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

// ── Feed queries ──────────────────────────────────────────────────────────────

export function useAllPosts() {
  const { actor } = useActor();
  return useQuery({
    queryKey: ["allPosts"],
    queryFn: async (): Promise<Post[]> => {
      if (!actor) return [];
      return (actor as any).getAllPosts() as Promise<Post[]>;
    },
    enabled: !!actor,
    staleTime: STALE_SHORT,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });
}

export function useAllReels() {
  const { actor } = useActor();
  return useQuery({
    queryKey: ["allReels"],
    queryFn: async (): Promise<Reel[]> => {
      if (!actor) return [];
      return (actor as any).getAllReels() as Promise<Reel[]>;
    },
    enabled: !!actor,
    staleTime: STALE_SHORT,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });
}

export function useActiveStories() {
  const { actor } = useActor();
  return useQuery({
    queryKey: ["activeStories"],
    queryFn: async (): Promise<Story[]> => {
      if (!actor) return [];
      return (actor as any).getActiveStories() as Promise<Story[]>;
    },
    enabled: !!actor,
    staleTime: STALE_SHORT,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });
}

export function usePostsByUser(user: Principal | null) {
  const { actor } = useActor();
  return useQuery({
    queryKey: ["postsByUser", user?.toString()],
    queryFn: async (): Promise<Post[]> => {
      if (!actor || !user) return [];
      return (actor as any).getPostsByUser(user) as Promise<Post[]>;
    },
    enabled: !!actor && !!user,
    staleTime: STALE_SHORT,
    placeholderData: keepPreviousData,
  });
}

export function useReelsByUser(user: Principal | null) {
  const { actor } = useActor();
  return useQuery({
    queryKey: ["reelsByUser", user?.toString()],
    queryFn: async (): Promise<Reel[]> => {
      if (!actor || !user) return [];
      return (actor as any).getReelsByUser(user) as Promise<Reel[]>;
    },
    enabled: !!actor && !!user,
    staleTime: STALE_SHORT,
    placeholderData: keepPreviousData,
  });
}

export function usePostComments(postId: bigint | null) {
  const { actor } = useActor();
  return useQuery({
    queryKey: ["postComments", postId?.toString()],
    queryFn: async (): Promise<Comment[]> => {
      if (!actor || postId === null) return [];
      return (actor as any).getPostComments(postId) as Promise<Comment[]>;
    },
    enabled: !!actor && postId !== null,
    staleTime: 5000,
  });
}

export function useReelComments(reelId: bigint | null) {
  const { actor } = useActor();
  return useQuery({
    queryKey: ["reelComments", reelId?.toString()],
    queryFn: async (): Promise<Comment[]> => {
      if (!actor || reelId === null) return [];
      return (actor as any).getReelComments(reelId) as Promise<Comment[]>;
    },
    enabled: !!actor && reelId !== null,
    staleTime: 5000,
  });
}

export function useCreatePost() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      blobId,
      caption,
    }: { blobId: string; caption: string }) => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).createPost(blobId, caption) as Promise<bigint>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allPosts"] });
      qc.invalidateQueries({ queryKey: ["postsByUser"] });
    },
  });
}

export function useCreateReel() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      blobId,
      caption,
      audioId,
      songName,
      artistName,
    }: {
      blobId: string;
      caption: string;
      audioId?: string;
      songName?: string;
      artistName?: string;
    }) => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).createReel(
        blobId,
        caption,
        audioId ? [audioId] : [],
        songName ? [songName] : [],
        artistName ? [artistName] : [],
      ) as Promise<bigint>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allReels"] });
      qc.invalidateQueries({ queryKey: ["reelsByUser"] });
    },
  });
}

export function useCreateStory() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      blobId,
      audioId,
      songName,
      artistName,
    }: {
      blobId: string;
      audioId?: string;
      songName?: string;
      artistName?: string;
    }) => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).createStory(
        blobId,
        audioId ? [audioId] : [],
        songName ? [songName] : [],
        artistName ? [artistName] : [],
      ) as Promise<bigint>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activeStories"] });
    },
  });
}

export function useDeletePost() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (postId: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.deletePost(postId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allPosts"] });
      qc.invalidateQueries({ queryKey: ["postsByUser"] });
    },
  });
}

export function useDeleteReel() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reelId: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.deleteReel(reelId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allReels"] });
      qc.invalidateQueries({ queryKey: ["reelsByUser"] });
    },
  });
}

export function useDeleteStory() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (_storyId: bigint) => {
      if (!actor) throw new Error("Not connected");
      // Stories auto-expire in 24h; call deleteExpiredStories as best-effort
      return (actor as any).deleteExpiredStories() as Promise<void>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activeStories"] });
    },
  });
}

export function useLikePost() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (postId: bigint) => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).likePost(postId) as Promise<void>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allPosts"] });
    },
  });
}

export function useUnlikePost() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (postId: bigint) => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).unlikePost(postId) as Promise<void>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allPosts"] });
    },
  });
}

export function useLikeReel() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reelId: bigint) => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).likeReel(reelId) as Promise<void>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allReels"] });
    },
  });
}

export function useUnlikeReel() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reelId: bigint) => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).unlikeReel(reelId) as Promise<void>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allReels"] });
    },
  });
}

export function useCommentOnPost() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, text }: { postId: bigint; text: string }) => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).commentOnPost(postId, text) as Promise<bigint>;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({
        queryKey: ["postComments", vars.postId.toString()],
      });
      qc.invalidateQueries({ queryKey: ["allPosts"] });
    },
  });
}

export function useCommentOnReel() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ reelId, text }: { reelId: bigint; text: string }) => {
      if (!actor) throw new Error("Not connected");
      return (actor as any).commentOnReel(reelId, text) as Promise<bigint>;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({
        queryKey: ["reelComments", vars.reelId.toString()],
      });
      qc.invalidateQueries({ queryKey: ["allReels"] });
    },
  });
}

// Re-export FollowRequestStatus for convenience
export { FollowRequestStatus };

export function useUsernameByPrincipal(principal: Principal | null) {
  const { actor } = useActor();
  return useQuery({
    queryKey: ["usernameByPrincipal", principal?.toString()],
    queryFn: async () => {
      if (!actor || !principal) return null;
      return (actor as any).getUsernameByPrincipal(principal) as Promise<
        string | null
      >;
    },
    enabled: !!actor && !!principal,
    staleTime: 300_000,
    placeholderData: keepPreviousData,
  });
}
