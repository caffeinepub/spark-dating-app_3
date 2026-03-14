import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Principal } from "@icp-sdk/core/principal";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { useState } from "react";
import {
  useFollowUser,
  useFollowing,
  useLikeUser,
  useMatches,
  useUnfollowUser,
  useUnlikeUser,
  useUserProfile,
  useWhoILiked,
} from "../hooks/useQueries";

export default function UserProfilePage() {
  const { userId } = useParams({ from: "/layout/profile/$userId" });
  const navigate = useNavigate();
  let principal: Principal | null = null;
  try {
    if (userId) principal = userId as unknown as Principal;
  } catch {
    principal = null;
  }

  const { data: profile, isLoading } = useUserProfile(principal);
  const { data: whoILiked } = useWhoILiked();
  const { data: following } = useFollowing();
  const { data: matches } = useMatches();

  const likedSet = new Set((whoILiked ?? []).map((p) => p.toString()));
  const followingSet = new Set((following ?? []).map((p) => p.toString()));
  const matchSet = new Set((matches ?? []).map((p) => p.principal?.toString()));

  const isLiked = likedSet.has(userId ?? "");
  const isFollowing = followingSet.has(userId ?? "");
  const isMatched = matchSet.has(userId ?? "");

  const [liked, setLiked] = useState(isLiked);
  const [follow, setFollow] = useState(isFollowing);

  const likeUser = useLikeUser();
  const unlikeUser = useUnlikeUser();
  const followUser = useFollowUser();
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

  const handleFollow = () => {
    if (!principal) return;
    if (follow) {
      setFollow(false);
      unfollowUser.mutate(principal);
    } else {
      setFollow(true);
      followUser.mutate(principal);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-lg px-4 py-8">
        <Skeleton className="h-10 w-24 mb-6" />
        <Skeleton className="aspect-square w-full rounded-2xl mb-6" />
        <Skeleton className="h-8 w-48 mb-3" />
        <Skeleton className="h-4 w-32" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto max-w-lg px-4 py-8 text-center">
        <p className="text-muted-foreground">Profile not found.</p>
        <Button
          onClick={() => navigate({ to: "/discover" })}
          variant="outline"
          className="mt-4"
        >
          Go back
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-lg px-4 py-8">
      <button
        type="button"
        onClick={() => navigate({ to: "/discover" })}
        data-ocid="profile.edit_button"
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
        <Button
          onClick={handleFollow}
          size="lg"
          variant="outline"
          className="flex-1"
        >
          {follow ? (
            <>
              <UserCheck className="w-5 h-5 mr-2 text-primary" /> Following
            </>
          ) : (
            <>
              <UserPlus className="w-5 h-5 mr-2" /> Follow
            </>
          )}
        </Button>
        {isMatched && (
          <Button
            size="lg"
            onClick={() => navigate({ to: `/messages/${userId}` })}
            className="flex-1 gradient-primary text-white border-0"
          >
            <MessageCircle className="w-5 h-5 mr-2" /> Message
          </Button>
        )}
      </div>
    </div>
  );
}
