import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "@tanstack/react-router";
import { Heart, MessageCircle } from "lucide-react";
import { useMatches } from "../hooks/useQueries";

export default function MatchesPage() {
  const navigate = useNavigate();
  const { data: matches, isLoading } = useMatches();

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold mb-1">Matches</h1>
        <p className="text-muted-foreground">People who like you back ❤️</p>
      </div>

      {isLoading ? (
        <div
          data-ocid="matches.loading_state"
          className="grid grid-cols-2 md:grid-cols-3 gap-4"
        >
          {["1", "2", "3", "4", "5", "6"].map((k) => (
            <div key={k} className="rounded-2xl overflow-hidden">
              <Skeleton className="aspect-square w-full" />
              <Skeleton className="h-16 w-full mt-1" />
            </div>
          ))}
        </div>
      ) : !matches || matches.length === 0 ? (
        <div data-ocid="matches.empty_state" className="text-center py-24">
          <div className="w-20 h-20 mx-auto gradient-soft rounded-full flex items-center justify-center mb-4">
            <Heart className="w-10 h-10 text-primary" />
          </div>
          <h3 className="font-display text-xl font-semibold mb-2">
            No matches yet
          </h3>
          <p className="text-muted-foreground mb-4">
            Start liking people on the Discover page — when they like you back,
            you'll match!
          </p>
          <Button
            onClick={() => navigate({ to: "/discover" })}
            className="gradient-primary text-white border-0"
          >
            Explore Profiles
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {matches.map((profile, i) => (
            <button
              type="button"
              key={profile.principal?.toString() ?? i}
              data-ocid={`matches.item.${i + 1}`}
              className="group bg-card rounded-2xl shadow-card border border-border overflow-hidden card-hover cursor-pointer text-left w-full"
              onClick={() =>
                navigate({ to: `/profile/${profile.principal?.toString()}` })
              }
            >
              <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-accent to-muted">
                {profile.photoLink ? (
                  <img
                    src={profile.photoLink}
                    alt={profile.displayName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full gradient-soft flex items-center justify-center">
                    <span className="text-5xl font-display text-white/80">
                      {profile.displayName?.charAt(0).toUpperCase() ?? "?"}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <div className="absolute top-3 right-3">
                  <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center shadow-glow">
                    <Heart className="w-4 h-4 text-white fill-white" />
                  </div>
                </div>
              </div>
              <div className="p-3">
                <p className="font-semibold truncate">{profile.displayName}</p>
                <div className="flex flex-wrap gap-1 mt-1 mb-3">
                  {profile.interests.slice(0, 2).map((interest) => (
                    <Badge
                      key={interest.id.toString()}
                      variant="secondary"
                      className="text-xs gradient-soft border-0"
                    >
                      {interest.name}
                    </Badge>
                  ))}
                </div>
                <Button
                  data-ocid={`matches.message_button.${i + 1}`}
                  size="sm"
                  className="w-full gradient-primary text-white border-0 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate({
                      to: `/messages/${profile.principal?.toString()}`,
                    });
                  }}
                >
                  <MessageCircle className="w-3 h-3 mr-1" />
                  Message
                </Button>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
