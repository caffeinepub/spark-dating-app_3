import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { Principal } from "@icp-sdk/core/principal";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  Camera,
  Edit3,
  Film,
  Grid3X3,
  Lock,
  LogOut,
  Plus,
  Save,
  Users,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Post, Profile, Reel } from "../backend.d";
import { Gender } from "../backend.d";
import CreateContentModal from "../components/CreateContentModal";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useFollowerCount,
  useFollowers,
  useFollowing,
  useFollowingCount,
  useMyProfile,
  usePostsByUser,
  useReelsByUser,
  useSaveProfile,
  useUserProfile,
} from "../hooks/useQueries";

type DetailMedia =
  | { type: "post"; data: Post }
  | { type: "reel"; data: Reel }
  | null;

type FollowListType = "followers" | "following" | null;

function FollowListModal({
  type,
  onClose,
}: {
  type: FollowListType;
  onClose: () => void;
}) {
  const { data: followers = [], isLoading: flLoading } = useFollowers();
  const { data: following = [], isLoading: fgLoading } = useFollowing();

  const principals: Principal[] = type === "followers" ? followers : following;
  const isLoading = type === "followers" ? flLoading : fgLoading;
  const title = type === "followers" ? "Followers" : "Following";

  return (
    <Dialog open={!!type} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        data-ocid="profile.follow_list.dialog"
        className="max-w-sm w-full rounded-2xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-lg">{title}</h2>
          <button
            type="button"
            data-ocid="profile.follow_list.close_button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {isLoading ? (
          <div className="space-y-3">
            {["1", "2", "3"].map((k) => (
              <div key={k} className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-28 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : principals.length === 0 ? (
          <div
            data-ocid="profile.follow_list.empty_state"
            className="text-center py-8 text-muted-foreground text-sm"
          >
            No {title.toLowerCase()} yet.
          </div>
        ) : (
          <ScrollArea className="h-72 pr-2">
            <div className="space-y-2">
              {principals.map((p, i) => (
                <FollowUserRow
                  key={p.toString()}
                  principal={p}
                  index={i + 1}
                  scope={type ?? "followers"}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}

function FollowUserRow({
  principal,
  index,
  scope,
}: {
  principal: Principal;
  index: number;
  scope: string;
}) {
  const navigate = useNavigate();
  const { data: profile } = useUserProfile(principal);
  const displayName =
    profile?.displayName ?? `${principal.toString().slice(0, 10)}...`;
  return (
    <button
      type="button"
      data-ocid={`profile.${scope}.item.${index}`}
      onClick={() => navigate({ to: `/profile/${principal.toString()}` })}
      className="flex w-full items-center gap-3 p-2 rounded-xl hover:bg-accent/50 transition-colors"
    >
      <Avatar className="w-10 h-10 shrink-0">
        <AvatarImage src={profile?.photoLink} />
        <AvatarFallback className="gradient-soft text-white font-bold text-sm">
          {displayName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="text-left min-w-0">
        <p className="font-semibold text-sm truncate">{displayName}</p>
        <p className="text-xs text-muted-foreground truncate">
          {principal.toString().slice(0, 12)}...
        </p>
      </div>
    </button>
  );
}

export default function OwnProfilePage() {
  const { identity, clear } = useInternetIdentity();
  const { actor } = useActor();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const saveProfile = useSaveProfile();
  const { data: myProfile, isLoading: profileLoading } = useMyProfile();
  const fileRef = useRef<HTMLInputElement>(null);

  const myPrincipal = identity?.getPrincipal() ?? null;
  const { data: myPosts = [], isLoading: postsLoading } =
    usePostsByUser(myPrincipal);
  const { data: myReels = [], isLoading: reelsLoading } =
    useReelsByUser(myPrincipal);

  const { data: followerCount = 0n } = useFollowerCount();
  const { data: followingCount = 0n } = useFollowingCount();

  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [photoLink, setPhotoLink] = useState("");
  const [photoPreview, setPhotoPreview] = useState("");
  const [interestInput, setInterestInput] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailMedia, setDetailMedia] = useState<DetailMedia>(null);
  const [followListType, setFollowListType] = useState<FollowListType>(null);

  useEffect(() => {
    if (!actor) return;
    (actor as any)
      .getMyUsername()
      .then((u: string | null) => {
        if (u) setUsername(u);
      })
      .catch(() => null);
  }, [actor]);

  const enterEditMode = () => {
    if (myProfile) {
      setDisplayName(myProfile.displayName ?? "");
      setBio((myProfile as any).bio ?? "");
      setPhotoLink(myProfile.photoLink ?? "");
      setPhotoPreview(myProfile.photoLink ?? "");
      setInterests(myProfile.interests?.map((i) => i.name) ?? []);
    }
    setIsEditing(true);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setPhotoPreview(previewUrl);
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoLink(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const addInterest = () => {
    const trimmed = interestInput.trim();
    if (!trimmed || interests.includes(trimmed)) return;
    setInterests((prev) => [...prev, trimmed]);
    setInterestInput("");
  };

  const removeInterest = (name: string) => {
    setInterests((prev) => prev.filter((i) => i !== name));
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      toast.error("Please enter a display name.");
      return;
    }
    if (!actor || !identity) {
      toast.error("Not connected.");
      return;
    }
    setIsSaving(true);
    const profile: Profile = {
      id: myProfile?.id ?? 0n,
      displayName: displayName.trim(),
      photoLink,
      bio,
      gender: myProfile?.gender ?? Gender.other,
      genderPreference: myProfile?.genderPreference ?? Gender.other,
      interests: interests.map((name, idx) => ({ id: BigInt(idx), name })),
      principal: identity.getPrincipal(),
      isActive: true,
      lastActive: BigInt(Date.now()) * 1_000_000n,
    };
    try {
      await saveProfile.mutateAsync(profile);
      toast.success("Profile saved!");
      setIsEditing(false);
    } catch {
      toast.error("Failed to save profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    if (actor) await (actor as any).setOffline().catch(() => null);
    clear();
    qc.clear();
    navigate({ to: "/" });
  };

  const profileBio = (myProfile as any)?.bio ?? "";
  const profileInterests: string[] =
    myProfile?.interests?.map((i) => i.name) ?? [];

  if (profileLoading) {
    return (
      <div className="container mx-auto max-w-lg px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="w-20 h-20 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-lg px-0 md:px-4 pb-8">
      {/* Detail media dialog */}
      {detailMedia && (
        <Dialog
          open={!!detailMedia}
          onOpenChange={(v) => !v && setDetailMedia(null)}
        >
          <DialogContent
            data-ocid="profile.media.dialog"
            className="max-w-lg w-full rounded-2xl p-0 overflow-hidden"
          >
            {detailMedia.type === "post" ? (
              <img
                src={detailMedia.data.blobId}
                alt={detailMedia.data.caption}
                className="w-full object-contain max-h-[80vh]"
              />
            ) : (
              <video
                src={detailMedia.data.blobId}
                controls
                autoPlay
                className="w-full max-h-[80vh] object-contain bg-black"
              >
                <track kind="captions" />
              </video>
            )}
            {(detailMedia.data as any).caption && (
              <p className="px-4 py-3 text-sm">
                {(detailMedia.data as any).caption}
              </p>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Follow list modal */}
      {followListType && (
        <FollowListModal
          type={followListType}
          onClose={() => setFollowListType(null)}
        />
      )}

      {/* Create content modal */}
      <CreateContentModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        defaultTab="post"
      />

      {!isEditing ? (
        /* ── VIEW MODE ── */
        <div>
          {/* Header */}
          <div className="sticky top-0 z-10 glass border-b border-border flex items-center justify-between px-4 h-14">
            <h1 className="font-display font-bold text-lg gradient-text">
              {username ? `@${username}` : "My Profile"}
            </h1>
            <div className="flex items-center gap-2">
              <button
                type="button"
                data-ocid="profile.edit_button"
                onClick={enterEditMode}
                className="p-2 rounded-full hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                type="button"
                data-ocid="profile.add_post.button"
                onClick={() => setCreateOpen(true)}
                className="p-2 rounded-full hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                type="button"
                data-ocid="profile.logout.button"
                onClick={handleLogout}
                className="p-2 rounded-full hover:bg-accent transition-colors text-rose-500 hover:text-rose-600"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="px-4 py-4">
            {/* Profile header row */}
            <div className="flex items-start gap-4 mb-4">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="w-20 h-20 rounded-full overflow-hidden ring-2 ring-primary/30">
                  {myProfile?.photoLink ? (
                    <img
                      src={myProfile.photoLink}
                      alt={myProfile.displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full gradient-soft flex items-center justify-center">
                      <span className="font-display text-3xl text-white/80">
                        {myProfile?.displayName?.charAt(0)?.toUpperCase() ??
                          "?"}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats + actions */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-4 text-center">
                  <div>
                    <p className="font-bold text-sm">{myPosts.length}</p>
                    <p className="text-xs text-muted-foreground">Posts</p>
                  </div>
                  <div>
                    <p className="font-bold text-sm">{myReels.length}</p>
                    <p className="text-xs text-muted-foreground">Reels</p>
                  </div>
                  <button
                    type="button"
                    data-ocid="profile.followers.button"
                    onClick={() => setFollowListType("followers")}
                    className="text-center hover:opacity-70 transition-opacity cursor-pointer"
                  >
                    <p className="font-bold text-sm">{Number(followerCount)}</p>
                    <p className="text-xs text-muted-foreground">Followers</p>
                  </button>
                  <button
                    type="button"
                    data-ocid="profile.following.button"
                    onClick={() => setFollowListType("following")}
                    className="text-center hover:opacity-70 transition-opacity cursor-pointer"
                  >
                    <p className="font-bold text-sm">
                      {Number(followingCount)}
                    </p>
                    <p className="text-xs text-muted-foreground">Following</p>
                  </button>
                </div>
              </div>
            </div>

            {/* Name + username + bio */}
            <div className="space-y-0.5 mb-3">
              <h1 className="font-display font-bold text-base">
                {myProfile?.displayName || "—"}
              </h1>
              {username && (
                <p className="text-sm text-muted-foreground">@{username}</p>
              )}
              {profileBio ? (
                <p className="text-sm text-foreground/80 mt-1">{profileBio}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No bio yet.
                </p>
              )}
            </div>

            {/* Interests */}
            {profileInterests.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {profileInterests.map((name) => (
                  <Badge
                    key={name}
                    className="gradient-soft text-white border-0 text-xs"
                  >
                    {name}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Posts + Reels grid tabs */}
          <div className="border-t border-border">
            <Tabs defaultValue="posts">
              <TabsList className="w-full rounded-none bg-transparent border-b border-border h-11 px-0">
                <TabsTrigger
                  data-ocid="profile.posts.tab"
                  value="posts"
                  className="flex-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
                >
                  <Grid3X3 className="w-4 h-4 mr-1.5" />
                  Posts
                </TabsTrigger>
                <TabsTrigger
                  data-ocid="profile.reels.tab"
                  value="reels"
                  className="flex-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
                >
                  <Film className="w-4 h-4 mr-1.5" />
                  Reels
                </TabsTrigger>
              </TabsList>
              <TabsContent value="posts" className="mt-0">
                {postsLoading ? (
                  <div className="grid grid-cols-3 gap-0.5">
                    {["1", "2", "3", "4", "5", "6"].map((k) => (
                      <Skeleton key={k} className="aspect-square w-full" />
                    ))}
                  </div>
                ) : myPosts.length === 0 ? (
                  <div
                    data-ocid="profile.posts.empty_state"
                    className="text-center py-12 text-muted-foreground"
                  >
                    <Grid3X3 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No posts yet</p>
                    <Button
                      data-ocid="profile.create_post.button"
                      variant="ghost"
                      size="sm"
                      className="mt-2 gap-1.5 text-primary"
                      onClick={() => setCreateOpen(true)}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Share your first post
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-0.5">
                    {myPosts.map((post, i) => (
                      <button
                        key={post.id.toString()}
                        type="button"
                        data-ocid={`profile.post.item.${i + 1}`}
                        onClick={() =>
                          setDetailMedia({ type: "post", data: post })
                        }
                        className="aspect-square overflow-hidden hover:opacity-90 transition-opacity"
                      >
                        <img
                          src={post.blobId}
                          alt={post.caption}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="reels" className="mt-0">
                {reelsLoading ? (
                  <div className="grid grid-cols-3 gap-0.5">
                    {["1", "2", "3"].map((k) => (
                      <Skeleton key={k} className="aspect-square w-full" />
                    ))}
                  </div>
                ) : myReels.length === 0 ? (
                  <div
                    data-ocid="profile.reels.empty_state"
                    className="text-center py-12 text-muted-foreground"
                  >
                    <Film className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No reels yet</p>
                    <Button
                      data-ocid="profile.create_reel.button"
                      variant="ghost"
                      size="sm"
                      className="mt-2 gap-1.5 text-primary"
                      onClick={() => setCreateOpen(true)}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Share your first reel
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-0.5">
                    {myReels.map((reel, i) => (
                      <button
                        key={reel.id.toString()}
                        type="button"
                        data-ocid={`profile.reel.item.${i + 1}`}
                        onClick={() =>
                          setDetailMedia({ type: "reel", data: reel })
                        }
                        className="aspect-square overflow-hidden relative hover:opacity-90 transition-opacity bg-black"
                      >
                        <video
                          src={reel.blobId}
                          className="w-full h-full object-cover"
                        >
                          <track kind="captions" />
                        </video>
                        <div className="absolute bottom-1 right-1">
                          <Film className="w-3.5 h-3.5 text-white drop-shadow" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      ) : (
        /* ── EDIT MODE ── */
        <div className="px-4 py-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-xl">Edit Profile</h2>
            <button
              type="button"
              data-ocid="profile.cancel_button"
              onClick={() => setIsEditing(false)}
              className="text-muted-foreground hover:text-foreground p-1 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Photo */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden ring-2 ring-primary/30">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full gradient-soft flex items-center justify-center">
                    <span className="font-display text-3xl text-white/80">
                      {displayName?.charAt(0)?.toUpperCase() ?? "?"}
                    </span>
                  </div>
                )}
              </div>
              <button
                type="button"
                data-ocid="profile.upload_button"
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full gradient-primary flex items-center justify-center shadow-glow"
              >
                <Camera className="w-3.5 h-3.5 text-white" />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoSelect}
              />
            </div>
          </div>

          {/* Username (read-only) */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-muted-foreground" />
              Username
            </Label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-muted text-muted-foreground text-sm">
              @{username || "—"}
            </div>
            <p className="text-xs text-muted-foreground">
              Username cannot be changed.
            </p>
          </div>

          {/* Display name */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Display Name</Label>
            <Input
              id="edit-name"
              data-ocid="profile.name.input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
            />
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-bio">Bio</Label>
            <Textarea
              id="edit-bio"
              data-ocid="profile.bio.textarea"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell people about yourself..."
              rows={3}
            />
          </div>

          {/* Interests */}
          <div className="space-y-1.5">
            <Label>Interests</Label>
            <div className="flex gap-2">
              <Input
                data-ocid="profile.interest.input"
                value={interestInput}
                onChange={(e) => setInterestInput(e.target.value)}
                placeholder="Add interest..."
                onKeyDown={(e) => e.key === "Enter" && addInterest()}
                className="flex-1"
              />
              <Button
                data-ocid="profile.interest.add_button"
                type="button"
                variant="outline"
                size="sm"
                onClick={addInterest}
                className="gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </Button>
            </div>
            {interests.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {interests.map((name) => (
                  <Badge
                    key={name}
                    className="gradient-soft text-white border-0 text-xs gap-1 pr-1"
                  >
                    {name}
                    <button
                      type="button"
                      onClick={() => removeInterest(name)}
                      className="ml-0.5 hover:opacity-70"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Save */}
          <div className="flex gap-3 pt-2">
            <Button
              data-ocid="profile.save.submit_button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 gradient-primary text-white border-0 gap-2"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isSaving ? "Saving..." : "Save Profile"}
            </Button>
            <Button
              data-ocid="profile.cancel.secondary_button"
              variant="outline"
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </Button>
          </div>

          {/* Logout */}
          <Button
            data-ocid="profile.logout.button"
            variant="ghost"
            onClick={handleLogout}
            className="w-full text-rose-500 hover:text-rose-600 gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </Button>
        </div>
      )}
    </div>
  );
}
