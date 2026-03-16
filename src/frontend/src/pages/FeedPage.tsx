import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { Principal } from "@icp-sdk/core/principal";
import { formatDistanceToNow } from "date-fns";
import {
  Bookmark,
  Film,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Send,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { Comment, Post, Reel, Story } from "../backend.d";
import CreateContentModal from "../components/CreateContentModal";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useActiveStories,
  useAllPosts,
  useAllReels,
  useCommentOnPost,
  useCommentOnReel,
  useDeletePost,
  useDeleteReel,
  useDeleteStory,
  useLikePost,
  useLikeReel,
  usePostComments,
  useReelComments,
  useUnlikePost,
  useUnlikeReel,
  useUserProfile,
} from "../hooks/useQueries";

// ── Types ───────────────────────────────────────────────────────────────────────────────

type FeedItem = { type: "post"; data: Post } | { type: "reel"; data: Reel };

type DetailItem =
  | { type: "post"; data: Post }
  | { type: "reel"; data: Reel }
  | null;

// ── Content Options Menu (three dots) ─────────────────────────────────────────────

function ContentOptionsMenu({
  isAuthor,
  onDelete,
  onSave,
  onShare,
  ocidPrefix,
}: {
  isAuthor: boolean;
  onDelete?: () => void;
  onSave: () => void;
  onShare: () => void;
  ocidPrefix: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          data-ocid={`${ocidPrefix}.open_modal_button`}
          className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-accent transition-colors"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem
          data-ocid={`${ocidPrefix}.share_button`}
          onClick={onShare}
          className="flex items-center gap-2 cursor-pointer"
        >
          <Share2 className="w-4 h-4" />
          Share
        </DropdownMenuItem>
        <DropdownMenuItem
          data-ocid={`${ocidPrefix}.save_button`}
          onClick={onSave}
          className="flex items-center gap-2 cursor-pointer"
        >
          <Bookmark className="w-4 h-4" />
          Save
        </DropdownMenuItem>
        {isAuthor && onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              data-ocid={`${ocidPrefix}.delete_button`}
              onClick={onDelete}
              className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Story ring ───────────────────────────────────────────────────────────────────

function StoryCircle({
  story,
  onView,
}: {
  story: Story;
  onView: (story: Story) => void;
}) {
  const principal = story.author;
  const { data: profile } = useUserProfile(principal);
  const initial = principal.toString().slice(0, 2).toUpperCase();

  return (
    <button
      type="button"
      data-ocid="feed.story.button"
      onClick={() => onView(story)}
      className="flex flex-col items-center gap-1.5 flex-shrink-0 group"
    >
      <div className="p-0.5 rounded-full bg-gradient-to-tr from-pink-500 via-fuchsia-500 to-purple-600 shadow-glow">
        <div className="p-0.5 rounded-full bg-background">
          <Avatar className="w-14 h-14">
            <AvatarImage src={profile?.photoLink} />
            <AvatarFallback className="gradient-soft text-white font-semibold text-xs">
              {profile?.displayName?.charAt(0)?.toUpperCase() ?? initial}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
      <span className="text-xs text-muted-foreground truncate w-16 text-center">
        {profile?.displayName?.split(" ")[0] ?? initial}
      </span>
    </button>
  );
}

function AddStoryCircle({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      data-ocid="feed.add_story.button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 flex-shrink-0"
    >
      <div className="w-[62px] h-[62px] rounded-full border-2 border-dashed border-primary/40 flex items-center justify-center hover:border-primary hover:bg-accent/50 transition-colors">
        <Plus className="w-5 h-5 text-primary" />
      </div>
      <span className="text-xs text-muted-foreground">Your story</span>
    </button>
  );
}

// ── Story Viewer ─────────────────────────────────────────────────────────────────

function StoryViewer({
  story,
  onClose,
  myPrincipal,
}: {
  story: Story;
  onClose: () => void;
  myPrincipal?: Principal;
}) {
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { data: profile } = useUserProfile(story.author);
  const deleteStory = useDeleteStory();
  const isVideo = story.blobId.startsWith("data:video");
  const isAuthor = myPrincipal
    ? story.author.toString() === myPrincipal.toString()
    : false;

  // biome-ignore lint/correctness/useExhaustiveDependencies: story.id is used as a reset trigger
  useEffect(() => {
    setProgress(0);
    intervalRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(intervalRef.current!);
          onClose();
          return 100;
        }
        return p + 1;
      });
    }, 50);
    return () => clearInterval(intervalRef.current!);
  }, [story.id, onClose]);

  const handleDelete = async () => {
    try {
      await deleteStory.mutateAsync(story.id);
      toast.success("Story delete ho gayi");
      onClose();
    } catch {
      toast.error("Story delete nahi ho saki");
    }
  };

  const handleSave = () => {
    const link = document.createElement("a");
    link.href = story.blobId;
    link.download = `story-${story.id}.${isVideo ? "mp4" : "jpg"}`;
    link.click();
    toast.success("Story save ho gayi");
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: "Story", url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copy ho gaya");
    }
  };

  return (
    <div
      data-ocid="feed.story_viewer.dialog"
      className="fixed inset-0 z-50 bg-black flex items-center justify-center"
      // biome-ignore lint/a11y/noNoninteractiveTabindex: interactive via onClick/onKeyDown
      tabIndex={0}
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClose();
      }}
    >
      {/* Progress bar */}
      <div className="absolute top-4 left-4 right-4 h-1 bg-white/30 rounded-full">
        <div
          className="h-full bg-white rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Author */}
      <div className="absolute top-8 left-4 flex items-center gap-2">
        <Avatar className="w-8 h-8 ring-2 ring-white/50">
          <AvatarImage src={profile?.photoLink} />
          <AvatarFallback className="gradient-soft text-white text-xs">
            {profile?.displayName?.charAt(0) ?? "?"}
          </AvatarFallback>
        </Avatar>
        <span className="text-white text-sm font-medium">
          {profile?.displayName ?? story.author.toString().slice(0, 8)}
        </span>
        <span className="text-white/60 text-xs">
          {formatDistanceToNow(new Date(Number(story.timestamp / 1_000_000n)), {
            addSuffix: true,
          })}
        </span>
      </div>

      {/* Three-dot menu for story */}
      <div
        className="absolute top-7 right-4"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              data-ocid="feed.story.options.open_modal_button"
              className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem
              data-ocid="feed.story.options.share_button"
              onClick={handleShare}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              Share
            </DropdownMenuItem>
            <DropdownMenuItem
              data-ocid="feed.story.options.save_button"
              onClick={handleSave}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Bookmark className="w-4 h-4" />
              Save
            </DropdownMenuItem>
            {isAuthor && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  data-ocid="feed.story.options.delete_button"
                  onClick={handleDelete}
                  className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Close */}
      <button
        type="button"
        data-ocid="feed.story_viewer.close_button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-8 right-12 text-white/80 hover:text-white"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Media */}
      <div className="w-full max-w-sm h-full max-h-[calc(100vh-4rem)] flex items-center justify-center">
        {isVideo ? (
          <video
            src={story.blobId}
            autoPlay
            playsInline
            className="max-h-full w-full object-contain"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") e.stopPropagation();
            }}
          >
            <track kind="captions" />
          </video>
        ) : (
          <img
            src={story.blobId}
            alt="Story"
            // biome-ignore lint/a11y/noNoninteractiveTabindex: interactive via onClick/onKeyDown
            tabIndex={0}
            className="max-h-full w-full object-contain"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") e.stopPropagation();
            }}
          />
        )}
      </div>
    </div>
  );
}

// ── Author line helper ─────────────────────────────────────────────────────────────────

function AuthorLine({ principal }: { principal: Principal }) {
  const { data: profile } = useUserProfile(principal);
  return (
    <div className="flex items-center gap-2">
      <Avatar className="w-8 h-8">
        <AvatarImage src={profile?.photoLink} />
        <AvatarFallback className="gradient-soft text-white text-xs font-semibold">
          {profile?.displayName?.charAt(0)?.toUpperCase() ??
            principal.toString().slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div>
        <p className="font-semibold text-sm leading-none">
          {profile?.displayName ?? principal.toString().slice(0, 10)}
        </p>
      </div>
    </div>
  );
}

// ── Post Card ─────────────────────────────────────────────────────────────────────────────

function PostCard({
  post,
  myPrincipal,
  onOpenDetail,
  index,
}: {
  post: Post;
  myPrincipal: Principal | undefined;
  onOpenDetail: (item: DetailItem) => void;
  index: number;
}) {
  const isLiked = myPrincipal
    ? post.likes.some((p) => p.toString() === myPrincipal.toString())
    : false;
  const likePost = useLikePost();
  const unlikePost = useUnlikePost();
  const deletePost = useDeletePost();
  const [likeAnim, setLikeAnim] = useState(false);
  const isAuthor = myPrincipal
    ? post.author.toString() === myPrincipal.toString()
    : false;

  const handleLike = () => {
    setLikeAnim(true);
    setTimeout(() => setLikeAnim(false), 400);
    if (isLiked) {
      unlikePost.mutate(post.id);
    } else {
      likePost.mutate(post.id);
    }
  };

  const handleDelete = async () => {
    try {
      await deletePost.mutateAsync(post.id);
      toast.success("Post delete ho gayi");
    } catch {
      toast.error("Post delete nahi ho saki");
    }
  };

  const handleSave = () => {
    const link = document.createElement("a");
    link.href = post.blobId;
    link.download = `post-${post.id}.jpg`;
    link.click();
    toast.success("Post save ho gayi");
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: post.caption || "Post",
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copy ho gaya");
    }
  };

  return (
    <article
      data-ocid={`feed.post.item.${index}`}
      className="bg-card border border-border rounded-2xl overflow-hidden shadow-card"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <AuthorLine principal={post.author} />
        <ContentOptionsMenu
          isAuthor={isAuthor}
          onDelete={handleDelete}
          onSave={handleSave}
          onShare={handleShare}
          ocidPrefix={`feed.post.options.${index}`}
        />
      </div>

      {/* Image */}
      <div
        className="aspect-square bg-muted cursor-pointer"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: interactive via onClick/onKeyDown
        tabIndex={0}
        onDoubleClick={handleLike}
        onClick={() => onOpenDetail({ type: "post", data: post })}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ")
            onOpenDetail({ type: "post", data: post });
        }}
      >
        <img
          src={post.blobId}
          alt={post.caption || "Post"}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Actions */}
      <div className="px-4 pt-3 pb-1 flex items-center gap-3">
        <button
          type="button"
          data-ocid={`feed.post.like.button.${index}`}
          onClick={handleLike}
          className={`heart-btn transition-colors ${
            isLiked
              ? "text-red-500 liked"
              : "text-muted-foreground hover:text-foreground"
          } ${likeAnim ? "animate-heartbeat" : ""}`}
        >
          <Heart className="w-6 h-6" fill={isLiked ? "currentColor" : "none"} />
        </button>
        <button
          type="button"
          data-ocid={`feed.post.comment.button.${index}`}
          onClick={() => onOpenDetail({ type: "post", data: post })}
          className="text-muted-foreground hover:text-foreground"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
        <button
          type="button"
          onClick={handleShare}
          className="text-muted-foreground hover:text-foreground"
        >
          <Send className="w-6 h-6" />
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="ml-auto text-muted-foreground hover:text-foreground"
        >
          <Bookmark className="w-6 h-6" />
        </button>
      </div>

      {/* Likes & caption */}
      <div className="px-4 pb-4 space-y-1">
        <p className="font-semibold text-sm">{post.likes.length} likes</p>
        {post.caption && (
          <p className="text-sm">
            <span className="font-semibold mr-1">
              {post.author.toString().slice(0, 8)}
            </span>
            {post.caption}
          </p>
        )}
        {Number(post.commentCount) > 0 && (
          <button
            type="button"
            onClick={() => onOpenDetail({ type: "post", data: post })}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            View all {Number(post.commentCount)} comments
          </button>
        )}
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
          {formatDistanceToNow(new Date(Number(post.timestamp / 1_000_000n)), {
            addSuffix: true,
          })}
        </p>
      </div>
    </article>
  );
}

// ── Reel Card ────────────────────────────────────────────────────────────────────────────

function ReelCard({
  reel,
  myPrincipal,
  onOpenDetail,
  index,
}: {
  reel: Reel;
  myPrincipal: Principal | undefined;
  onOpenDetail: (item: DetailItem) => void;
  index: number;
}) {
  const isLiked = myPrincipal
    ? reel.likes.some((p) => p.toString() === myPrincipal.toString())
    : false;
  const likeReel = useLikeReel();
  const unlikeReel = useUnlikeReel();
  const deleteReel = useDeleteReel();
  const videoRef = useRef<HTMLVideoElement>(null);
  const isAuthor = myPrincipal
    ? reel.author.toString() === myPrincipal.toString()
    : false;

  const handleLike = () => {
    if (isLiked) {
      unlikeReel.mutate(reel.id);
    } else {
      likeReel.mutate(reel.id);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteReel.mutateAsync(reel.id);
      toast.success("Reel delete ho gayi");
    } catch {
      toast.error("Reel delete nahi ho saki");
    }
  };

  const handleSave = () => {
    const link = document.createElement("a");
    link.href = reel.blobId;
    link.download = `reel-${reel.id}.mp4`;
    link.click();
    toast.success("Reel save ho gayi");
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: reel.caption || "Reel",
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copy ho gaya");
    }
  };

  return (
    <article
      data-ocid={`feed.reel.item.${index}`}
      className="bg-card border border-border rounded-2xl overflow-hidden shadow-card"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <AuthorLine principal={reel.author} />
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs text-primary font-medium">
            <Film className="w-3.5 h-3.5" />
            Reel
          </span>
          <ContentOptionsMenu
            isAuthor={isAuthor}
            onDelete={handleDelete}
            onSave={handleSave}
            onShare={handleShare}
            ocidPrefix={`feed.reel.options.${index}`}
          />
        </div>
      </div>

      {/* Video */}
      <div
        className="aspect-[9/16] bg-black relative cursor-pointer"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: interactive via onClick/onKeyDown
        tabIndex={0}
        onClick={() => onOpenDetail({ type: "reel", data: reel })}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ")
            onOpenDetail({ type: "reel", data: reel });
        }}
      >
        <video
          ref={videoRef}
          src={reel.blobId}
          className="w-full h-full object-cover"
          loop
          muted
          playsInline
          onMouseEnter={() => videoRef.current?.play()}
          onMouseLeave={() => videoRef.current?.pause()}
        />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center">
            <Film className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 pt-3 pb-1 flex items-center gap-3">
        <button
          type="button"
          data-ocid={`feed.reel.like.button.${index}`}
          onClick={handleLike}
          className={`heart-btn transition-colors ${
            isLiked
              ? "text-red-500 liked"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Heart className="w-6 h-6" fill={isLiked ? "currentColor" : "none"} />
        </button>
        <button
          type="button"
          data-ocid={`feed.reel.comment.button.${index}`}
          onClick={() => onOpenDetail({ type: "reel", data: reel })}
          className="text-muted-foreground hover:text-foreground"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
        <button
          type="button"
          onClick={handleShare}
          className="text-muted-foreground hover:text-foreground"
        >
          <Send className="w-6 h-6" />
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="ml-auto text-muted-foreground hover:text-foreground"
        >
          <Bookmark className="w-6 h-6" />
        </button>
      </div>

      <div className="px-4 pb-4 space-y-1">
        <p className="font-semibold text-sm">{reel.likes.length} likes</p>
        {reel.caption && (
          <p className="text-sm">
            <span className="font-semibold mr-1">
              {reel.author.toString().slice(0, 8)}
            </span>
            {reel.caption}
          </p>
        )}
        {Number(reel.commentCount) > 0 && (
          <button
            type="button"
            onClick={() => onOpenDetail({ type: "reel", data: reel })}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            View all {Number(reel.commentCount)} comments
          </button>
        )}
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
          {formatDistanceToNow(new Date(Number(reel.timestamp / 1_000_000n)), {
            addSuffix: true,
          })}
        </p>
      </div>
    </article>
  );
}

// ── Detail / Comments dialog ──────────────────────────────────────────────────────────

function DetailDialog({
  item,
  onClose,
  myPrincipal,
}: {
  item: DetailItem;
  onClose: () => void;
  myPrincipal: Principal | undefined;
}) {
  const [commentText, setCommentText] = useState("");
  const postId = item?.type === "post" ? item.data.id : null;
  const reelId = item?.type === "reel" ? item.data.id : null;
  const { data: postComments = [] } = usePostComments(postId);
  const { data: reelComments = [] } = useReelComments(reelId);
  const commentOnPost = useCommentOnPost();
  const commentOnReel = useCommentOnReel();
  const likePost = useLikePost();
  const unlikePost = useUnlikePost();
  const likeReel = useLikeReel();
  const unlikeReel = useUnlikeReel();

  const comments: Comment[] =
    item?.type === "post" ? postComments : reelComments;

  if (!item) return null;

  const data = item.data;
  const isLiked = myPrincipal
    ? data.likes.some((p) => p.toString() === myPrincipal.toString())
    : false;

  const handleLike = () => {
    if (item.type === "post") {
      isLiked ? unlikePost.mutate(data.id) : likePost.mutate(data.id);
    } else {
      isLiked ? unlikeReel.mutate(data.id) : likeReel.mutate(data.id);
    }
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    try {
      if (item.type === "post") {
        await commentOnPost.mutateAsync({ postId: data.id, text: commentText });
      } else {
        await commentOnReel.mutateAsync({ reelId: data.id, text: commentText });
      }
      setCommentText("");
    } catch {
      toast.error("Failed to post comment.");
    }
  };

  const isVideo = item.type === "reel";

  return (
    <Dialog open={!!item} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        data-ocid="feed.detail.dialog"
        className="max-w-4xl w-full p-0 overflow-hidden rounded-2xl max-h-[90vh] flex"
      >
        {/* Media side */}
        <div className="flex-1 bg-black hidden md:flex items-center justify-center">
          {isVideo ? (
            <video
              src={(data as Reel).blobId}
              controls
              autoPlay
              loop
              className="max-h-[90vh] max-w-full object-contain"
            >
              <track kind="captions" />
            </video>
          ) : (
            <img
              src={(data as Post).blobId}
              alt={(data as Post).caption}
              className="max-h-[90vh] max-w-full object-contain"
            />
          )}
        </div>

        {/* Comments side */}
        <div className="w-full md:w-80 flex flex-col">
          {/* Author */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <AuthorLine principal={data.author} />
            <button
              type="button"
              data-ocid="feed.detail.close_button"
              onClick={onClose}
              className="ml-auto text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile media */}
          <div className="md:hidden aspect-square bg-black">
            {isVideo ? (
              <video
                src={(data as Reel).blobId}
                controls
                autoPlay
                className="w-full h-full object-contain"
              >
                <track kind="captions" />
              </video>
            ) : (
              <img
                src={(data as Post).blobId}
                alt={(data as Post).caption}
                className="w-full h-full object-contain"
              />
            )}
          </div>

          {/* Caption & Comments */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {"caption" in data && data.caption && (
              <p className="text-sm">
                <span className="font-semibold mr-1">
                  {data.author.toString().slice(0, 8)}
                </span>
                {data.caption}
              </p>
            )}
            {comments.length === 0 ? (
              <p
                data-ocid="feed.comments.empty_state"
                className="text-sm text-muted-foreground text-center py-4"
              >
                No comments yet. Be the first!
              </p>
            ) : (
              comments.map((c, i) => (
                <div
                  key={c.id.toString()}
                  data-ocid={`feed.comment.item.${i + 1}`}
                  className="flex gap-2 text-sm"
                >
                  <Avatar className="w-7 h-7 flex-shrink-0">
                    <AvatarFallback className="gradient-soft text-white text-[10px]">
                      {c.author.toString().slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <span className="font-semibold">
                      {c.author.toString().slice(0, 8)}{" "}
                    </span>
                    <span className="text-foreground">{c.text}</span>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {formatDistanceToNow(
                        new Date(Number(c.timestamp / 1_000_000n)),
                        { addSuffix: true },
                      )}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Like bar */}
          <div className="px-4 py-2 border-t border-border">
            <div className="flex items-center gap-3 mb-2">
              <button
                type="button"
                data-ocid="feed.detail.like.button"
                onClick={handleLike}
                className={`heart-btn transition-colors ${
                  isLiked
                    ? "text-red-500"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Heart
                  className="w-6 h-6"
                  fill={isLiked ? "currentColor" : "none"}
                />
              </button>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
              >
                <MessageCircle className="w-6 h-6" />
              </button>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({ url: window.location.href });
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                    toast.success("Link copy ho gaya");
                  }
                }}
              >
                <Send className="w-6 h-6" />
              </button>
            </div>
            <p className="text-xs font-semibold mb-3">
              {data.likes.length} likes
            </p>

            {/* Add comment */}
            <div className="flex gap-2">
              <Input
                data-ocid="feed.detail.comment.input"
                placeholder="Add a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleComment()}
                className="flex-1 h-8 text-sm"
              />
              <Button
                data-ocid="feed.detail.comment.submit_button"
                size="sm"
                onClick={handleComment}
                disabled={
                  !commentText.trim() ||
                  commentOnPost.isPending ||
                  commentOnReel.isPending
                }
                className="gradient-primary text-white border-0 h-8 px-3"
              >
                Post
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Feed Page ───────────────────────────────────────────────────────────────────────

export default function FeedPage() {
  const { identity } = useInternetIdentity();
  const myPrincipal = identity?.getPrincipal();

  const { data: posts = [], isLoading: postsLoading } = useAllPosts();
  const { data: reels = [], isLoading: reelsLoading } = useAllReels();
  const { data: stories = [], isLoading: storiesLoading } = useActiveStories();

  const [createOpen, setCreateOpen] = useState(false);
  const [createTab, setCreateTab] = useState<"post" | "reel" | "story">("post");
  const [viewingStory, setViewingStory] = useState<Story | null>(null);
  const [detailItem, setDetailItem] = useState<DetailItem>(null);

  // Merge posts and reels, sort by timestamp descending
  const feedItems = useMemo((): FeedItem[] => {
    const items: FeedItem[] = [
      ...posts.map((p): FeedItem => ({ type: "post", data: p })),
      ...reels.map((r): FeedItem => ({ type: "reel", data: r })),
    ];
    return items.sort((a, b) => Number(b.data.timestamp - a.data.timestamp));
  }, [posts, reels]);

  // Only show skeleton on first load -- when there's truly no data yet
  const showSkeleton = (postsLoading || reelsLoading) && feedItems.length === 0;
  const showStoriesSkeleton = storiesLoading && stories.length === 0;

  const openCreate = (tab: "post" | "reel" | "story") => {
    setCreateTab(tab);
    setCreateOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Stories viewer overlay */}
      {viewingStory && (
        <StoryViewer
          story={viewingStory}
          onClose={() => setViewingStory(null)}
          myPrincipal={myPrincipal}
        />
      )}

      {/* Detail dialog */}
      <DetailDialog
        item={detailItem}
        onClose={() => setDetailItem(null)}
        myPrincipal={myPrincipal}
      />

      {/* Create modal */}
      <CreateContentModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        defaultTab={createTab}
      />

      <div className="max-w-lg mx-auto px-0 md:px-4">
        {/* Header */}
        <div className="sticky top-0 z-10 glass border-b border-border flex items-center justify-between px-4 h-14">
          <h1 className="font-display font-bold text-xl gradient-text">Feed</h1>
          <button
            type="button"
            data-ocid="feed.create.open_modal_button"
            onClick={() => openCreate("post")}
            className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center shadow-glow hover:shadow-glow-lg transition-shadow"
          >
            <Plus className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Stories row */}
        <div className="px-4 py-4 border-b border-border">
          {showStoriesSkeleton ? (
            <div className="flex gap-4 overflow-x-auto pb-1">
              {[1, 2, 3, 4].map((k) => (
                <div
                  key={k}
                  className="flex flex-col items-center gap-1.5 flex-shrink-0"
                >
                  <Skeleton className="w-[62px] h-[62px] rounded-full" />
                  <Skeleton className="w-10 h-3 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-hide">
              <AddStoryCircle onClick={() => openCreate("story")} />
              {stories.map((story) => (
                <StoryCircle
                  key={story.id.toString()}
                  story={story}
                  onView={setViewingStory}
                />
              ))}
              {stories.length === 0 && (
                <p
                  data-ocid="feed.stories.empty_state"
                  className="text-sm text-muted-foreground self-center"
                >
                  No stories yet · Be the first!
                </p>
              )}
            </div>
          )}
        </div>

        {/* Feed */}
        <div className="py-4 space-y-4 px-4">
          {showSkeleton ? (
            <div data-ocid="feed.loading_state" className="space-y-4">
              {[1, 2, 3].map((k) => (
                <div
                  key={k}
                  className="rounded-2xl border border-border overflow-hidden"
                >
                  <div className="flex items-center gap-2 p-4">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <Skeleton className="w-24 h-3 rounded" />
                  </div>
                  <Skeleton className="aspect-square w-full" />
                  <div className="p-4 space-y-2">
                    <Skeleton className="w-16 h-3 rounded" />
                    <Skeleton className="w-40 h-3 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : feedItems.length === 0 ? (
            <div data-ocid="feed.empty_state" className="text-center py-20">
              <div className="w-20 h-20 mx-auto gradient-soft rounded-full flex items-center justify-center mb-4">
                <Heart className="w-10 h-10 text-primary" />
              </div>
              <h3 className="font-display text-xl font-semibold mb-2">
                Nothing here yet
              </h3>
              <p className="text-muted-foreground mb-6">
                Share your first post or reel to get started!
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  data-ocid="feed.empty.create_post.button"
                  onClick={() => openCreate("post")}
                  className="gradient-primary text-white border-0 shadow-glow"
                >
                  Share a Post
                </Button>
                <Button
                  data-ocid="feed.empty.create_reel.button"
                  variant="outline"
                  onClick={() => openCreate("reel")}
                >
                  Share a Reel
                </Button>
              </div>
            </div>
          ) : (
            feedItems.map((item, i) =>
              item.type === "post" ? (
                <PostCard
                  key={`post-${item.data.id}`}
                  post={item.data}
                  myPrincipal={myPrincipal}
                  onOpenDetail={setDetailItem}
                  index={i + 1}
                />
              ) : (
                <ReelCard
                  key={`reel-${item.data.id}`}
                  reel={item.data}
                  myPrincipal={myPrincipal}
                  onOpenDetail={setDetailItem}
                  index={i + 1}
                />
              ),
            )
          )}
        </div>
      </div>
    </div>
  );
}
