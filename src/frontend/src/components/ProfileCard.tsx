import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Principal } from "@icp-sdk/core/principal";
import { useNavigate } from "@tanstack/react-router";
import { Heart, UserCheck, UserPlus } from "lucide-react";
import { useState } from "react";
import type { Profile } from "../backend.d";
import {
  useFollowUser,
  useLikeUser,
  useUnfollowUser,
  useUnlikeUser,
} from "../hooks/useQueries";

interface ProfileCardProps {
  profile: Profile;
  isLiked: boolean;
  isFollowing: boolean;
  index: number;
}

export default function ProfileCard({
  profile,
  isLiked,
  isFollowing,
  index,
}: ProfileCardProps) {
  const navigate = useNavigate();
  const [liked, setLiked] = useState(isLiked);
  const [following, setFollowing] = useState(isFollowing);
  const [heartAnim, setHeartAnim] = useState(false);
  const likeUser = useLikeUser();
  const unlikeUser = useUnlikeUser();
  const followUser = useFollowUser();
  const unfollowUser = useUnfollowUser();

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setHeartAnim(true);
    setTimeout(() => setHeartAnim(false), 400);
    if (liked) {
      setLiked(false);
      unlikeUser.mutate(profile.principal as unknown as Principal);
    } else {
      setLiked(true);
      likeUser.mutate(profile.principal as unknown as Principal);
    }
  };

  const handleFollow = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (following) {
      setFollowing(false);
      unfollowUser.mutate(profile.principal as unknown as Principal);
    } else {
      setFollowing(true);
      followUser.mutate(profile.principal as unknown as Principal);
    }
  };

  const principalStr = profile.principal?.toString() ?? "";
  const goToProfile = () => navigate({ to: `/profile/${principalStr}` });

  const genderLabel =
    profile.gender === "female"
      ? "Woman"
      : profile.gender === "male"
        ? "Man"
        : "Other";

  return (
    <article
      data-ocid={`discover.profile_card.${index}`}
      className="group relative bg-card rounded-2xl shadow-card card-hover card-shine overflow-hidden border border-border"
    >
      {/* ── Full-bleed photo with all overlays ── */}
      <button
        type="button"
        className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-t-2xl"
        onClick={goToProfile}
        aria-label={`View ${profile.displayName}'s profile`}
      >
        <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-br from-pink-200 to-purple-200">
          {/* Photo or gradient fallback */}
          {profile.photoLink ? (
            <img
              src={profile.photoLink}
              alt={profile.displayName}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              loading="lazy"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.88 0.08 350), oklch(0.82 0.10 295))",
              }}
            >
              <span className="text-6xl font-display text-white/90 drop-shadow-lg">
                {profile.displayName?.charAt(0).toUpperCase() ?? "?"}
              </span>
            </div>
          )}

          {/* Ambient inner shadow for photo depth */}
          <div className="absolute inset-0 shadow-[inset_0_0_40px_0px_rgba(0,0,0,0.15)]" />

          {/* Gradient scrim — bottom info */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

          {/* Bottom info overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-3.5">
            <p className="font-semibold text-white text-sm leading-tight truncate">
              {profile.displayName}
            </p>
            <p className="text-white/65 text-xs mt-0.5">{genderLabel}</p>
          </div>

          {/* Follow button — top-right, appears on hover */}
          <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0">
            <button
              type="button"
              data-ocid={`discover.follow_button.${index}`}
              onClick={handleFollow}
              className="w-8 h-8 rounded-full glass flex items-center justify-center shadow-lg border border-white/20"
              aria-label={following ? "Unfollow" : "Follow"}
            >
              {following ? (
                <UserCheck className="w-3.5 h-3.5 text-primary" />
              ) : (
                <UserPlus className="w-3.5 h-3.5 text-white" />
              )}
            </button>
          </div>
        </div>
      </button>

      {/* ── Card footer: interests + persistent heart ── */}
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        {/* Interest pills — up to 2 visible */}
        <div className="flex flex-wrap gap-1 min-w-0">
          {profile.interests.slice(0, 2).map((interest) => (
            <span
              key={interest.id.toString()}
              className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{
                background: "oklch(0.94 0.05 350)",
                color: "oklch(0.40 0.14 350)",
              }}
            >
              {interest.name}
            </span>
          ))}
          {profile.interests.length > 2 && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0.5 h-auto"
            >
              +{profile.interests.length - 2}
            </Badge>
          )}
        </div>

        {/* Heart button — always visible, the primary CTA */}
        <button
          type="button"
          data-ocid={`discover.like_button.${index}`}
          onClick={handleLike}
          className={cn(
            "heart-btn shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all",
            liked
              ? "gradient-primary shadow-glow"
              : "bg-muted hover:bg-accent border border-border",
            heartAnim ? "animate-heartbeat" : "",
          )}
          aria-label={liked ? "Unlike" : "Like"}
        >
          <Heart
            className={cn(
              "w-4 h-4 transition-all",
              liked ? "fill-white text-white" : "text-muted-foreground",
            )}
          />
        </button>
      </div>
    </article>
  );
}
