import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Principal } from "@icp-sdk/core/principal";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Clock,
  Heart,
  MessageCircle,
  RefreshCw,
  UserCheck,
  UserMinus,
  UserPlus,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  FollowRequestStatus,
  useFollowRequestStatus,
  useFollowers,
  useFollowing,
  useLikeUser,
  useMatches,
  useSendFollowRequest,
  useUnfollowUser,
  useUnlikeUser,
  useUserProfile,
  useWhoILiked,
} from "../hooks/useQueries";

export default function UserProfilePage() {
  const { userId } = useParams({ from: "/layout/profile/$userId" });
  const navigate = useNavigate();
  const [principal, setPrincipal] = useState<Principal | null>(null);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const { Principal } = await import("@icp-sdk/core/principal");
        setPrincipal(Principal.fromText(userId));
      } catch {
        setPrincipal(null);
      }
    })();
  }, [userId]);

  const {
    data: profile,
    isLoading,
    isError,
    refetch,
  } = useUserProfile(principal);
  const { data: whoILiked } = useWhoILiked();
  const { data: following } = useFollowing();
  const { data: followers } = useFollowers();
  const { data: matches } = useMatches();
  const { data: followStatus, isLoading: followStatusLoading } =
    useFollowRequestStatus(principal);

  const likedSet = useMemo(
    () => new Set((whoILiked ?? []).map((p) => p.toString())),
    [whoILiked],
  );
  const followingSet = useMemo(
    () => new Set((following ?? []).map((p) => p.toString())),
    [following],
  );
  const followersSet = useMemo(
    () => new Set((followers ?? []).map((p) => p.toString())),
    [followers],
  );
  const matchSet = useMemo(
    () => new Set((matches ?? []).map((p) => p.principal?.toString())),
    [matches],
  );

  const isLiked = likedSet.has(userId ?? "");
  const isCurrentlyFollowing = followingSet.has(userId ?? "");
  // Allow chat if this user follows me OR I follow them OR we're matched
  const theyFollowMe = followersSet.has(userId ?? "");
  const isMatched = matchSet.has(userId ?? "");

  const [liked, setLiked] = useState(isLiked);

  const likeUser = useLikeUser();
  const unlikeUser = useUnlikeUser();
  const sendFollowRequest = useSendFollowRequest();
  const unfollowUser = useUnfollowUser();

  const handleLike = () => {
    if (!principal) return;
    if (liked) {
      setLiked(false);
      unlikeUser.mutate(principal);
    } else {
      setLiked(true);
      likeUser.mutate(principal);
    }
  };

  const handleFollowAction = async () => {
    if (!principal) return;
    if (isCurrentlyFollowing) {
      unfollowUser.mutate(principal);
    } else if (followStatus === FollowRequestStatus.pending) {
      toast.info("Follow request already sent.");
    } else {
      try {
        await sendFollowRequest.mutateAsync(principal);
        toast.success("Follow request sent!");
      } catch {
        toast.error("Failed to send follow request.");
      }
    }
  };

  const getFollowButton = () => {
    if (followStatusLoading) {
      return (
        <Button size="lg" variant="outline" disabled className="flex-1">
          <Clock className="w-5 h-5 mr-2 animate-pulse" />
          Loading...
        </Button>
      );
    }
    if (isCurrentlyFollowing) {
      return (
        <Button
          data-ocid="profile.unfollow.button"
          onClick={handleFollowAction}
          size="lg"
          variant="outline"
          disabled={unfollowUser.isPending}
          className="flex-1"
        >
          <UserCheck className="w-5 h-5 mr-2 text-primary" />
          Following
        </Button>
      );
    }
    if (followStatus === FollowRequestStatus.pending) {
      return (
        <Button
          data-ocid="profile.requested.button"
          size="lg"
          variant="outline"
          disabled
          className="flex-1 opacity-60"
        >
          <Clock className="w-5 h-5 mr-2" />
          Requested
        </Button>
      );
    }
    return (
      <Button
        data-ocid="profile.follow.button"
        onClick={handleFollowAction}
        size="lg"
        variant="outline"
        disabled={sendFollowRequest.isPending}
        className="flex-1"
      >
        <UserPlus className="w-5 h-5 mr-2" />
        Follow
      </Button>
    );
  };

  // Show loading while principal is being parsed or profile is loading
  if (!principal || isLoading) {
    return (
      <div className="container mx-auto max-w-lg px-4 py-8">
        <Skeleton className="h-10 w-24 mb-6" />
        <Skeleton className="aspect-square w-full rounded-2xl mb-6" />
        <Skeleton className="h-8 w-48 mb-3" />
        <Skeleton className="h-4 w-32" />
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="container mx-auto max-w-lg px-4 py-8 text-center">
        <p className="text-muted-foreground mb-2">
          Profile not found or failed to load.
        </p>
        <div className="flex gap-3 justify-center mt-4">
          <Button onClick={() => refetch()} variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Retry
          </Button>
          <Button
            onClick={() => navigate({ to: "/discover" })}
            variant="outline"
          >
            Go back
          </Button>
        </div>
      </div>
    );
  }

  // Chat allowed if either user follows the other, or matched
  const canChat = isCurrentlyFollowing || theyFollowMe || isMatched;

  return (
    <div className="container mx-auto max-w-lg px-4 py-8">
      <button
        type="button"
        onClick={() => navigate({ to: "/discover" })}
        data-ocid="profile.back_button"
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Photo */}
      <div className="relative rounded-2xl overflow-hidden aspect-[4/5] mb-6 shadow-card-hover">
        {profile.photoLink ? (
          <img
            src={profile.photoLink}
            alt={profile.displayName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full gradient-soft flex items-center justify-center">
            <span className="text-8xl font-display text-white/80">
              {profile.displayName?.charAt(0).toUpperCase() ?? "?"}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <h1 className="font-display text-4xl font-bold mb-1">
            {profile.displayName}
          </h1>
          <p className="text-white/80 capitalize">{profile.gender}</p>
        </div>
        {isMatched && (
          <div className="absolute top-4 right-4">
            <Badge className="gradient-primary text-white border-0 shadow-glow">
              ❤️ It&apos;s a Match!
            </Badge>
          </div>
        )}
      </div>

      {/* Interests */}
      {profile.interests && profile.interests.length > 0 && (
        <div className="mb-6">
          <p className="text-sm font-medium text-muted-foreground mb-2">
            Interests
          </p>
          <div className="flex flex-wrap gap-2">
            {profile.interests.map((interest) => (
              <Badge
                key={interest.id.toString()}
                className="gradient-soft text-accent-foreground border-0 px-3 py-1"
              >
                {interest.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          data-ocid="profile.like.button"
          onClick={handleLike}
          size="lg"
          className={`flex-1 border-0 ${
            liked
              ? "gradient-primary text-white"
              : "bg-accent text-accent-foreground"
          }`}
        >
          <Heart className={`w-5 h-5 mr-2 ${liked ? "fill-white" : ""}`} />
          {liked ? "Liked" : "Like"}
        </Button>

        {getFollowButton()}

        {canChat && (
          <Button
            data-ocid="profile.chat.button"
            size="lg"
            onClick={() => navigate({ to: `/messages/${userId}` })}
            className="flex-1 gradient-primary text-white border-0"
          >
            <MessageCircle className="w-5 h-5 mr-2" /> Chat
          </Button>
        )}
      </div>

      {!canChat && (
        <p className="text-xs text-muted-foreground text-center mt-3">
          Follow this user or have them follow you to start chatting
        </p>
      )}
    </div>
  );
}
