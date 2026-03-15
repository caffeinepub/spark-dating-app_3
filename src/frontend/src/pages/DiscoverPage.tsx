import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import type { Profile } from "../backend.d";
import ProfileCard from "../components/ProfileCard";
import { useDiscoverProfiles } from "../hooks/useQueries";

const INTEREST_FILTERS = [
  "Travel",
  "Music",
  "Art",
  "Food",
  "Fitness",
  "Books",
  "Gaming",
  "Hiking",
  "Coffee",
  "Photography",
];

export default function DiscoverPage() {
  // isLoading = true only on first load (no cached data)
  // isFetching = true on every refetch (including background)
  const { data, isLoading, isFetching, refetch } = useDiscoverProfiles();

  const profiles = data?.profiles ?? [];
  const whoILiked = data?.whoILiked ?? [];
  const following = data?.following ?? [];

  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("all");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const likedSet = useMemo(
    () => new Set(whoILiked.map((p) => p.toString())),
    [whoILiked],
  );
  const followingSet = useMemo(
    () => new Set(following.map((p) => p.toString())),
    [following],
  );

  const filtered = useMemo(() => {
    return profiles.filter((p: Profile) => {
      if (search && !p.displayName.toLowerCase().includes(search.toLowerCase()))
        return false;
      if (genderFilter !== "all" && p.gender !== genderFilter) return false;
      if (selectedInterests.length > 0) {
        const names = p.interests.map((i) => i.name.toLowerCase());
        if (!selectedInterests.some((si) => names.includes(si.toLowerCase())))
          return false;
      }
      return true;
    });
  }, [profiles, search, genderFilter, selectedInterests]);

  const toggleInterest = (i: string) => {
    setSelectedInterests((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i],
    );
  };

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold mb-1">Discover</h1>
          <p className="text-muted-foreground">Find your perfect connection</p>
        </div>
        {/* Subtle background refresh indicator */}
        {isFetching && !isLoading && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>Updating...</span>
          </div>
        )}
      </div>

      {/* Search & Filter bar */}
      <div data-ocid="discover.filter_panel" className="mb-6 space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              data-ocid="discover.search_input"
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={genderFilter} onValueChange={setGenderFilter}>
            <SelectTrigger data-ocid="discover.gender_select" className="w-36">
              <SelectValue placeholder="Gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All genders</SelectItem>
              <SelectItem value="female">Women</SelectItem>
              <SelectItem value="male">Men</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => setShowFilters((v) => !v)}
            className={showFilters ? "border-primary text-primary" : ""}
          >
            <SlidersHorizontal className="w-4 h-4 mr-2" />
            Filters
          </Button>
          <Button variant="outline" onClick={() => refetch()} size="icon">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-2 p-4 bg-card rounded-xl border border-border animate-fade-up">
            <span className="text-sm font-medium text-muted-foreground w-full">
              Filter by interests:
            </span>
            {INTEREST_FILTERS.map((interest) => (
              <Badge
                key={interest}
                variant={
                  selectedInterests.includes(interest) ? "default" : "outline"
                }
                className={`cursor-pointer transition-all ${
                  selectedInterests.includes(interest)
                    ? "gradient-primary text-white border-0"
                    : ""
                }`}
                onClick={() => toggleInterest(interest)}
              >
                {interest}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Results count */}
      {!isLoading && (
        <p className="text-sm text-muted-foreground mb-4">
          {filtered.length} {filtered.length === 1 ? "person" : "people"} found
        </p>
      )}

      {/* Grid — show skeleton only on initial load, not on background refetch */}
      {isLoading ? (
        <div
          data-ocid="discover.loading_state"
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
        >
          {["1", "2", "3", "4", "5", "6", "7", "8"].map((k) => (
            <div key={k} className="rounded-2xl overflow-hidden">
              <Skeleton className="aspect-[3/4] w-full" />
              <Skeleton className="h-10 w-full mt-1" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div data-ocid="discover.empty_state" className="text-center py-24">
          <div className="w-20 h-20 mx-auto gradient-soft rounded-full flex items-center justify-center mb-4">
            <Search className="w-10 h-10 text-primary" />
          </div>
          <h3 className="font-display text-xl font-semibold mb-2">
            No profiles found
          </h3>
          <p className="text-muted-foreground mb-4">
            Try adjusting your filters or check back later.
          </p>
          <Button
            onClick={() => {
              setSearch("");
              setGenderFilter("all");
              setSelectedInterests([]);
            }}
            variant="outline"
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((profile, i) => (
            <ProfileCard
              key={profile.principal?.toString() ?? i}
              profile={profile}
              isLiked={likedSet.has(profile.principal?.toString() ?? "")}
              isFollowing={followingSet.has(
                profile.principal?.toString() ?? "",
              )}
              index={i + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
