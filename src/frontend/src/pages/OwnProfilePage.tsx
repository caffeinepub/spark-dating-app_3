import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
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
  useMyProfile,
  usePostsByUser,
  useReelsByUser,
  useSaveProfile,
} from "../hooks/useQueries";

type DetailMedia =
  | { type: "post"; data: Post }
  | { type: "reel"; data: Reel }
  | null;

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
    // Convert to base64 for persistent storage
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
      isActive: true,
      lastActive: BigInt(Date.now()) * 1_000_000n,
      principal: identity.getPrincipal(),
    } as any;
    saveProfile.mutate(profile, {
      onSuccess: () => {
        toast.success("Profile saved!");
        setIsSaving(false);
        setIsEditing(false);
      },
      onError: () => {
        toast.error("Failed to save profile.");
        setIsSaving(false);
      },
    });
  };

  const handleLogout = async () => {
    if (actor) await (actor as any).setOffline().catch(() => null);
    clear();
    qc.clear();
    navigate({ to: "/" });
  };

  const profileBio = (myProfile as any)?.bio ?? "";
  const profileInterests = myProfile?.interests?.map((i) => i.name) ?? [];

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div
          data-ocid="profile.loading_state"
          className="flex flex-col items-center gap-3"
        >
          <div className="w-16 h-16 rounded-full gradient-soft animate-pulse" />
          <p className="text-muted-foreground text-sm">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Create modal */}
      <CreateContentModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        defaultTab="post"
      />

      {/* Detail viewer */}
      <Dialog
        open={!!detailMedia}
        onOpenChange={(v) => !v && setDetailMedia(null)}
      >
        <DialogContent
          data-ocid="profile.media.dialog"
          className="max-w-lg p-0 overflow-hidden rounded-2xl"
        >
          {detailMedia?.type === "post" && (
            <img
              src={detailMedia.data.blobId}
              alt={detailMedia.data.caption}
              className="w-full max-h-[80vh] object-contain"
            />
          )}
          {detailMedia?.type === "reel" && (
            <video
              src={detailMedia.data.blobId}
              controls
              autoPlay
              className="w-full max-h-[80vh] object-contain"
            >
              <track kind="captions" />
            </video>
          )}
          {detailMedia &&
            "caption" in detailMedia.data &&
            detailMedia.data.caption && (
              <p className="px-4 py-3 text-sm border-t border-border">
                {detailMedia.data.caption}
              </p>
            )}
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="sticky top-0 z-10 glass border-b border-border flex items-center justify-between px-4 h-14">
        <span className="font-display font-bold text-lg gradient-text">
          {username ? `@${username}` : "My Profile"}
        </span>
        <button
          type="button"
          data-ocid="profile.logout.button"
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-sm text-destructive hover:bg-destructive/10 px-3 py-1.5 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>

      <div className="max-w-lg mx-auto">
        {!isEditing ? (
          /* ── VIEW MODE ── */
          <div>
            {/* Profile header */}
            <div className="px-4 py-6 space-y-4">
              <div className="flex items-end gap-6">
                {/* Avatar */}
                <div className="w-20 h-20 rounded-full overflow-hidden ring-2 ring-primary/30 ring-offset-2 ring-offset-background flex-shrink-0">
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
                  </div>
                  <Button
                    data-ocid="profile.edit_button"
                    variant="outline"
                    size="sm"
                    onClick={enterEditMode}
                    className="gap-1.5 w-full"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit Profile
                  </Button>
                </div>
              </div>

              {/* Name + username + bio */}
              <div className="space-y-0.5">
                <h1 className="font-display font-bold text-base">
                  {myProfile?.displayName || "—"}
                </h1>
                {username && (
                  <p className="text-sm text-muted-foreground">@{username}</p>
                )}
                {profileBio ? (
                  <p className="text-sm text-foreground/80 mt-1">
                    {profileBio}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No bio yet.
                  </p>
                )}
              </div>

              {/* Interests */}
              {profileInterests.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
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
                    className="flex-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-foreground gap-1.5 h-11"
                  >
                    <Grid3X3 className="w-4 h-4" />
                    Posts
                  </TabsTrigger>
                  <TabsTrigger
                    data-ocid="profile.reels.tab"
                    value="reels"
                    className="flex-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-foreground gap-1.5 h-11"
                  >
                    <Film className="w-4 h-4" />
                    Reels
                  </TabsTrigger>
                </TabsList>

                {/* Posts grid */}
                <TabsContent value="posts" className="mt-0">
                  {postsLoading ? (
                    <div className="grid grid-cols-3 gap-0.5">
                      {[1, 2, 3, 4, 5, 6].map((k) => (
                        <Skeleton key={k} className="aspect-square w-full" />
                      ))}
                    </div>
                  ) : myPosts.length === 0 ? (
                    <div
                      data-ocid="profile.posts.empty_state"
                      className="text-center py-16 space-y-3"
                    >
                      <p className="text-muted-foreground text-sm">
                        No posts yet
                      </p>
                      <Button
                        data-ocid="profile.add_post.button"
                        size="sm"
                        variant="outline"
                        onClick={() => setCreateOpen(true)}
                        className="gap-1.5"
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

                {/* Reels grid */}
                <TabsContent value="reels" className="mt-0">
                  {reelsLoading ? (
                    <div className="grid grid-cols-3 gap-0.5">
                      {[1, 2, 3, 4, 5, 6].map((k) => (
                        <Skeleton key={k} className="aspect-square w-full" />
                      ))}
                    </div>
                  ) : myReels.length === 0 ? (
                    <div
                      data-ocid="profile.reels.empty_state"
                      className="text-center py-16 space-y-3"
                    >
                      <p className="text-muted-foreground text-sm">
                        No reels yet
                      </p>
                      <Button
                        data-ocid="profile.add_reel.button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setCreateOpen(true);
                        }}
                        className="gap-1.5"
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

            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                data-ocid="profile.input"
                placeholder="Your display name..."
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>

            {/* Bio */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-bio">
                Bio
                <span className="text-muted-foreground text-xs ml-2">
                  {bio.length}/150
                </span>
              </Label>
              <Textarea
                id="edit-bio"
                data-ocid="profile.textarea"
                placeholder="Write something about yourself..."
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 150))}
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Interests */}
            <div className="space-y-2">
              <Label>Interests</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add an interest..."
                  value={interestInput}
                  onChange={(e) => setInterestInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addInterest()}
                  className="flex-1"
                />
                <Button onClick={addInterest} size="icon" variant="outline">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {interests.map((name) => (
                  <Badge
                    key={name}
                    className="gradient-soft text-white border-0 pr-1 gap-1"
                  >
                    {name}
                    <button
                      type="button"
                      onClick={() => removeInterest(name)}
                      className="ml-1 hover:opacity-70"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Save */}
            <Button
              data-ocid="profile.save_button"
              onClick={handleSave}
              disabled={isSaving || saveProfile.isPending}
              className="w-full gradient-primary text-white border-0 shadow-glow"
              size="lg"
            >
              {isSaving || saveProfile.isPending ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Profile
                </>
              )}
            </Button>

            {/* Logout */}
            <Button
              data-ocid="profile.logout.secondary_button"
              variant="outline"
              onClick={handleLogout}
              className="w-full text-destructive border-destructive/30 hover:bg-destructive/10 gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
