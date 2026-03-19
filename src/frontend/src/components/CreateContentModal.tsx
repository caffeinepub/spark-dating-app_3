import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Film, ImageIcon, Upload, Video, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  useCreatePost,
  useCreateReel,
  useCreateStory,
} from "../hooks/useQueries";
import MusicPicker, { type SelectedMusic } from "./MusicPicker";

interface CreateContentModalProps {
  open: boolean;
  onClose: () => void;
  defaultTab?: "post" | "reel" | "story";
}

const VIDEO_FILTERS: { label: string; value: string; css: string }[] = [
  { label: "Normal", value: "none", css: "none" },
  { label: "Vivid", value: "vivid", css: "saturate(1.8) contrast(1.1)" },
  {
    label: "Vintage",
    value: "vintage",
    css: "sepia(0.5) contrast(1.1) brightness(0.9)",
  },
  { label: "B&W", value: "bw", css: "grayscale(1) contrast(1.2)" },
  {
    label: "Warm",
    value: "warm",
    css: "sepia(0.3) saturate(1.4) brightness(1.05)",
  },
  {
    label: "Cool",
    value: "cool",
    css: "hue-rotate(20deg) saturate(0.9) brightness(1.05)",
  },
  {
    label: "Drama",
    value: "drama",
    css: "contrast(1.4) brightness(0.85) saturate(1.3)",
  },
  {
    label: "Fade",
    value: "fade",
    css: "opacity(0.85) brightness(1.1) saturate(0.7)",
  },
];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function CreateContentModal({
  open,
  onClose,
  defaultTab = "post",
}: CreateContentModalProps) {
  const [activeTab, setActiveTab] = useState<"post" | "reel" | "story">(
    defaultTab,
  );

  // Post state
  const [postFile, setPostFile] = useState<File | null>(null);
  const [postPreview, setPostPreview] = useState("");
  const [postCaption, setPostCaption] = useState("");

  // Reel state
  const [reelFile, setReelFile] = useState<File | null>(null);
  const [reelPreview, setReelPreview] = useState("");
  const [reelCaption, setReelCaption] = useState("");
  const [reelFilter, setReelFilter] = useState("none");
  const [isCameraMode, setIsCameraMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraFilter, setCameraFilter] = useState("none");
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const livePreviewRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Story state
  const [storyFile, setStoryFile] = useState<File | null>(null);
  const [storyPreview, setStoryPreview] = useState("");

  // Music state
  const [reelMusic, setReelMusic] = useState<SelectedMusic | null>(null);
  const [storyMusic, setStoryMusic] = useState<SelectedMusic | null>(null);

  const createPost = useCreatePost();
  const createReel = useCreateReel();
  const createStory = useCreateStory();

  const isSubmitting =
    createPost.isPending || createReel.isPending || createStory.isPending;

  useEffect(() => {
    if (open) setActiveTab(defaultTab);
  }, [open, defaultTab]);

  // Cleanup camera on close
  useEffect(() => {
    if (!open && cameraStream) {
      for (const t of cameraStream.getTracks()) t.stop();
      setCameraStream(null);
      setIsCameraMode(false);
      setIsRecording(false);
    }
  }, [open, cameraStream]);

  // Attach camera stream to live preview
  useEffect(() => {
    if (livePreviewRef.current && cameraStream) {
      livePreviewRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  const handleClose = () => {
    if (cameraStream) {
      for (const t of cameraStream.getTracks()) t.stop();
      setCameraStream(null);
    }
    setIsCameraMode(false);
    setIsRecording(false);
    setPostFile(null);
    setPostPreview("");
    setPostCaption("");
    setReelFile(null);
    setReelPreview("");
    setReelCaption("");
    setReelFilter("none");
    setReelMusic(null);
    setStoryMusic(null);
    setStoryFile(null);
    setStoryPreview("");
    onClose();
  };

  // ── Camera ──
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setCameraStream(stream);
      setIsCameraMode(true);
    } catch {
      toast.error("Camera access denied. Please allow camera permission.");
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      for (const t of cameraStream.getTracks()) t.stop();
      setCameraStream(null);
    }
    setIsCameraMode(false);
    setIsRecording(false);
  };

  const startRecording = () => {
    if (!cameraStream) return;
    chunksRef.current = [];
    const mr = new MediaRecorder(cameraStream);
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    mr.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      setReelPreview(url);
      setReelFile(new File([blob], "recording.webm", { type: "video/webm" }));
      stopCamera();
    };
    mr.start();
    mediaRecorderRef.current = mr;
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  // ── Submit handlers ──
  const submitPost = async () => {
    if (!postFile) {
      toast.error("Please select a photo.");
      return;
    }
    try {
      const blobId = await fileToBase64(postFile);
      await createPost.mutateAsync({ blobId, caption: postCaption });
      toast.success("Post shared! ✨");
      handleClose();
    } catch {
      toast.error("Failed to share post.");
    }
  };

  const submitReel = async () => {
    if (!reelFile) {
      toast.error("Please select or record a video.");
      return;
    }
    try {
      const blobId = reelPreview.startsWith("blob:")
        ? await blobToBase64(await fetch(reelPreview).then((r) => r.blob()))
        : await fileToBase64(reelFile);
      await createReel.mutateAsync({
        blobId,
        caption: reelCaption,
        audioId: reelMusic?.audioId,
        songName: reelMusic?.songName,
        artistName: reelMusic?.artistName,
      });
      toast.success("Reel shared! 🎬");
      handleClose();
    } catch {
      toast.error("Failed to share reel.");
    }
  };

  const submitStory = async () => {
    if (!storyFile) {
      toast.error("Please select a file.");
      return;
    }
    try {
      const blobId = await fileToBase64(storyFile);
      await createStory.mutateAsync({
        blobId,
        audioId: storyMusic?.audioId,
        songName: storyMusic?.songName,
        artistName: storyMusic?.artistName,
      });
      toast.success("Story added! 🌟");
      handleClose();
    } catch {
      toast.error("Failed to add story.");
    }
  };

  const activeFilter =
    VIDEO_FILTERS.find(
      (f) => f.value === (isCameraMode ? cameraFilter : reelFilter),
    )?.css ?? "none";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent
        data-ocid="create.dialog"
        className="max-w-md w-full p-0 overflow-hidden rounded-2xl"
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="font-display text-xl gradient-text">
            Create
          </DialogTitle>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "post" | "reel" | "story")}
          className="flex flex-col"
        >
          <TabsList className="mx-6 mt-4 mb-2 grid grid-cols-3">
            <TabsTrigger
              data-ocid="create.post.tab"
              value="post"
              className="gap-1.5"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              Post
            </TabsTrigger>
            <TabsTrigger
              data-ocid="create.reel.tab"
              value="reel"
              className="gap-1.5"
            >
              <Film className="w-3.5 h-3.5" />
              Reel
            </TabsTrigger>
            <TabsTrigger
              data-ocid="create.story.tab"
              value="story"
              className="gap-1.5"
            >
              <Video className="w-3.5 h-3.5" />
              Story
            </TabsTrigger>
          </TabsList>

          {/* ── POST TAB ── */}
          <TabsContent value="post" className="px-6 pb-6 space-y-4 mt-0">
            {postPreview ? (
              <div className="relative rounded-xl overflow-hidden aspect-square bg-muted">
                <img
                  src={postPreview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setPostFile(null);
                    setPostPreview("");
                  }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label
                data-ocid="create.post.dropzone"
                className="flex flex-col items-center gap-3 p-8 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 hover:bg-accent/50 transition-colors"
              >
                <div className="w-14 h-14 rounded-full gradient-soft flex items-center justify-center">
                  <Upload className="w-6 h-6 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-sm">Upload a photo</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    JPG, PNG, WEBP
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  data-ocid="create.post.upload_button"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setPostFile(f);
                    setPostPreview(URL.createObjectURL(f));
                  }}
                />
              </label>
            )}
            <div className="space-y-1.5">
              <Label>Caption</Label>
              <Textarea
                data-ocid="create.post.textarea"
                placeholder="Write a caption..."
                value={postCaption}
                onChange={(e) => setPostCaption(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
            <Button
              data-ocid="create.post.submit_button"
              onClick={submitPost}
              disabled={isSubmitting || !postFile}
              className="w-full gradient-primary text-white border-0 shadow-glow"
            >
              {createPost.isPending ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Sharing...
                </>
              ) : (
                "Share Post"
              )}
            </Button>
          </TabsContent>

          {/* ── REEL TAB ── */}
          <TabsContent value="reel" className="px-6 pb-6 space-y-4 mt-0">
            {isCameraMode ? (
              <div className="space-y-3">
                <div className="relative rounded-xl overflow-hidden aspect-[9/16] bg-black">
                  <video
                    ref={livePreviewRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                    style={{ filter: activeFilter }}
                  />
                  {isRecording && (
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 px-2 py-1 rounded-full">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-white text-xs font-medium">
                        REC
                      </span>
                    </div>
                  )}
                </div>
                {/* Filter strip */}
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {VIDEO_FILTERS.map((f) => (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => setCameraFilter(f.value)}
                      className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                        cameraFilter === f.value
                          ? "gradient-primary text-white shadow-glow"
                          : "bg-muted text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  {isRecording ? (
                    <Button
                      data-ocid="create.reel.stop_recording.button"
                      onClick={stopRecording}
                      variant="destructive"
                      className="flex-1"
                    >
                      Stop Recording
                    </Button>
                  ) : (
                    <Button
                      data-ocid="create.reel.start_recording.button"
                      onClick={startRecording}
                      className="flex-1 gradient-primary text-white border-0"
                    >
                      <div className="w-3 h-3 rounded-full bg-red-400 mr-2" />
                      Record
                    </Button>
                  )}
                  <Button variant="outline" onClick={stopCamera}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : reelPreview ? (
              <div className="space-y-3">
                <div className="relative rounded-xl overflow-hidden aspect-[9/16] bg-black">
                  <video
                    ref={videoPreviewRef}
                    src={reelPreview}
                    controls
                    className="w-full h-full object-cover"
                    style={{ filter: activeFilter }}
                  >
                    <track kind="captions" />
                  </video>
                  <button
                    type="button"
                    onClick={() => {
                      setReelFile(null);
                      setReelPreview("");
                    }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {/* Filter strip */}
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {VIDEO_FILTERS.map((f) => (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => setReelFilter(f.value)}
                      className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                        reelFilter === f.value
                          ? "gradient-primary text-white shadow-glow"
                          : "bg-muted text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <label
                  data-ocid="create.reel.dropzone"
                  className="flex flex-col items-center gap-3 p-8 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 hover:bg-accent/50 transition-colors"
                >
                  <div className="w-14 h-14 rounded-full gradient-soft flex items-center justify-center">
                    <Film className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-sm">Upload a video</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      MP4, WEBM, MOV
                    </p>
                  </div>
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    data-ocid="create.reel.upload_button"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      setReelFile(f);
                      setReelPreview(URL.createObjectURL(f));
                    }}
                  />
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">or</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <Button
                  data-ocid="create.reel.camera.button"
                  variant="outline"
                  onClick={startCamera}
                  className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/5"
                >
                  <Camera className="w-4 h-4" />
                  Record with Camera
                </Button>
              </div>
            )}

            {!isCameraMode && (
              <>
                <MusicPicker selected={reelMusic} onSelect={setReelMusic} />
                <div className="space-y-1.5">
                  <Label>Caption</Label>
                  <Textarea
                    data-ocid="create.reel.textarea"
                    placeholder="Write a caption..."
                    value={reelCaption}
                    onChange={(e) => setReelCaption(e.target.value)}
                    rows={2}
                    className="resize-none"
                  />
                </div>
                <Button
                  data-ocid="create.reel.submit_button"
                  onClick={submitReel}
                  disabled={isSubmitting || !reelFile}
                  className="w-full gradient-primary text-white border-0 shadow-glow"
                >
                  {createReel.isPending ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Sharing...
                    </>
                  ) : (
                    "Share Reel"
                  )}
                </Button>
              </>
            )}
          </TabsContent>

          {/* ── STORY TAB ── */}
          <TabsContent value="story" className="px-6 pb-6 space-y-4 mt-0">
            {storyPreview ? (
              <div className="relative rounded-xl overflow-hidden aspect-[9/16] bg-muted">
                {storyFile?.type.startsWith("video") ? (
                  <video
                    src={storyPreview}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={storyPreview}
                    alt="Story preview"
                    className="w-full h-full object-cover"
                  />
                )}
                <button
                  type="button"
                  onClick={() => {
                    setStoryFile(null);
                    setStoryPreview("");
                  }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label
                data-ocid="create.story.dropzone"
                className="flex flex-col items-center gap-3 p-8 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 hover:bg-accent/50 transition-colors"
              >
                <div className="w-14 h-14 rounded-full gradient-soft flex items-center justify-center">
                  <Video className="w-6 h-6 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-sm">Add to your story</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Photo or video · Disappears in 24h
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  data-ocid="create.story.upload_button"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setStoryFile(f);
                    setStoryPreview(URL.createObjectURL(f));
                  }}
                />
              </label>
            )}
            <MusicPicker selected={storyMusic} onSelect={setStoryMusic} />
            <Button
              data-ocid="create.story.submit_button"
              onClick={submitStory}
              disabled={isSubmitting || !storyFile}
              className="w-full gradient-primary text-white border-0 shadow-glow"
            >
              {createStory.isPending ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Adding...
                </>
              ) : (
                "Add Story"
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
