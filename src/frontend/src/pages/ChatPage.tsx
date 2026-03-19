import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Principal } from "@icp-sdk/core/principal";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Camera,
  Image,
  Mic,
  Music,
  Paperclip,
  Send,
  Video,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useCamera } from "../camera/useCamera";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useChat, useSendMessage, useUserProfile } from "../hooks/useQueries";

const MAX_IMAGE_SIZE = 1 * 1024 * 1024; // 1 MB
const MAX_MEDIA_SIZE = 5 * 1024 * 1024; // 5 MB

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function encodeMedia(
  dataUrl: string,
  type: "image" | "video" | "audio",
): string {
  const prefix =
    type === "image" ? "[IMAGE]" : type === "video" ? "[VIDEO]" : "[AUDIO]";
  return `${prefix}${dataUrl}`;
}

function MessageBubble({
  content,
  isMine,
  timestamp,
}: { content: string; isMine: boolean; timestamp?: bigint }) {
  const renderContent = () => {
    if (content.startsWith("[IMAGE]")) {
      const src = content.slice(7);
      return (
        <img
          src={src}
          alt="Shared media"
          className="max-w-[220px] rounded-xl"
        />
      );
    }
    if (content.startsWith("[VIDEO]")) {
      const src = content.slice(7);
      return (
        // biome-ignore lint/a11y/useMediaCaption: chat video message
        <video src={src} controls className="max-w-[220px] rounded-xl" />
      );
    }
    if (content.startsWith("[AUDIO]")) {
      const src = content.slice(7);
      return (
        // biome-ignore lint/a11y/useMediaCaption: chat audio message
        <audio src={src} controls className="max-w-[220px]" />
      );
    }
    return <span>{content}</span>;
  };

  const isMedia =
    content.startsWith("[IMAGE]") ||
    content.startsWith("[VIDEO]") ||
    content.startsWith("[AUDIO]");

  return (
    <div
      className={cn(
        "max-w-[70%] rounded-2xl text-sm shadow-xs",
        isMedia
          ? isMine
            ? "rounded-br-sm overflow-hidden"
            : "rounded-bl-sm overflow-hidden"
          : isMine
            ? "gradient-primary text-white rounded-br-sm px-4 py-2.5"
            : "bg-card border border-border text-foreground rounded-bl-sm px-4 py-2.5",
      )}
    >
      {renderContent()}
      {!isMedia && (
        <div
          className={cn("text-xs mt-1 opacity-60", isMine ? "text-right" : "")}
        >
          {timestamp
            ? new Date(Number(timestamp) / 1_000_000).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : ""}
        </div>
      )}
    </div>
  );
}

export default function ChatPage() {
  const { userId } = useParams({ from: "/layout/messages/$userId" });
  const navigate = useNavigate();
  const { identity } = useInternetIdentity();
  const [message, setMessage] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showInlineCamera, setShowInlineCamera] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceTime, setVoiceTime] = useState(0);
  const voiceRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceChunksRef = useRef<Blob[]>([]);
  const voiceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const otherPrincipal = useMemo(() => {
    if (!userId) return null;
    try {
      return Principal.fromText(userId);
    } catch {
      return null;
    }
  }, [userId]);

  const { data: messages, isLoading } = useChat(otherPrincipal);
  const { data: profile } = useUserProfile(otherPrincipal);
  const sendMessage = useSendMessage();

  const myPrincipal = identity?.getPrincipal()?.toString() ?? "";

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (content?: string) => {
    const text = (content ?? message).trim();
    if (!text || !otherPrincipal) return;
    if (!content) setMessage("");
    sendMessage.mutate({ recipient: otherPrincipal, content: text });
  };

  const sendMediaFile = useCallback(
    async (file: File, type: "image" | "video" | "audio") => {
      const limit = type === "image" ? MAX_IMAGE_SIZE : MAX_MEDIA_SIZE;
      if (file.size > limit) {
        toast.error(
          `File too large. Max size: ${type === "image" ? "1MB" : "5MB"}`,
        );
        return;
      }
      if (!otherPrincipal) return;
      try {
        const dataUrl = await fileToBase64(file);
        const encoded = encodeMedia(dataUrl, type);
        sendMessage.mutate({ recipient: otherPrincipal, content: encoded });
      } catch {
        toast.error("Failed to send media");
      }
    },
    [otherPrincipal, sendMessage],
  );

  const handleFileInput = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "image" | "video" | "audio",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setShowAttachMenu(false);
    await sendMediaFile(file, type);
  };

  const inlineCamera = useCamera({ facingMode: "environment" });

  const handleInlineCameraCapture = useCallback(async () => {
    const file = await inlineCamera.capturePhoto();
    if (file) {
      setShowInlineCamera(false);
      inlineCamera.stopCamera();
      await sendMediaFile(file, "image");
    } else {
      toast.error("Failed to capture");
    }
  }, [inlineCamera, sendMediaFile]);

  const startVoiceRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      voiceChunksRef.current = [];
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) voiceChunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        for (const track of stream.getTracks()) track.stop();
        const blob = new Blob(voiceChunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `voice_${Date.now()}.webm`, {
          type: "audio/webm",
        });
        await sendMediaFile(file, "audio");
      };
      mr.start();
      voiceRecorderRef.current = mr;
      setIsRecordingVoice(true);
      setVoiceTime(0);
      voiceTimerRef.current = setInterval(
        () => setVoiceTime((t) => t + 1),
        1000,
      );
    } catch {
      toast.error("Microphone access denied");
    }
  }, [sendMediaFile]);

  const stopVoiceRecording = useCallback(() => {
    voiceRecorderRef.current?.stop();
    setIsRecordingVoice(false);
    if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
  }, []);

  const formatVoiceTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="glass border-b border-border px-4 py-3 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: "/messages" })}
          className="shrink-0"
          data-ocid="chat.back_button"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="w-10 h-10 rounded-full gradient-soft flex items-center justify-center overflow-hidden shrink-0">
          {profile?.photoLink ? (
            <img
              src={profile.photoLink}
              alt={profile.displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="font-display text-lg text-primary">
              {profile?.displayName?.charAt(0).toUpperCase() ?? "?"}
            </span>
          )}
        </div>
        <div>
          <p className="font-semibold">
            {profile?.displayName ?? "Loading..."}
          </p>
          <p className="text-xs text-muted-foreground">
            {profile?.isActive ? "Active now" : "Offline"}
          </p>
        </div>
      </div>

      {/* Inline camera */}
      {showInlineCamera && (
        <div
          className="relative bg-black"
          style={{ height: 300 }}
          data-ocid="chat.camera.panel"
        >
          <video
            ref={inlineCamera.videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ transform: "scaleX(-1)" }}
          />
          <canvas ref={inlineCamera.canvasRef} className="hidden" />
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-6">
            <Button
              size="icon"
              variant="ghost"
              className="text-white hover:bg-white/20 rounded-full"
              onClick={() => {
                setShowInlineCamera(false);
                inlineCamera.stopCamera();
              }}
              data-ocid="chat.camera.close_button"
            >
              <X className="w-5 h-5" />
            </Button>
            <button
              type="button"
              disabled={!inlineCamera.isActive}
              onClick={handleInlineCameraCapture}
              data-ocid="chat.camera.capture_button"
              className={cn(
                "w-14 h-14 rounded-full border-4 border-white bg-white/20 flex items-center justify-center transition-all",
                !inlineCamera.isActive && "opacity-40 cursor-not-allowed",
              )}
            >
              <Camera className="w-7 h-7 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {isLoading ? (
          <div data-ocid="messages.loading_state" className="space-y-3">
            {["1", "2", "3", "4"].map((k) => (
              <div
                key={k}
                className={cn(
                  "flex",
                  Number(k) % 2 === 0 ? "justify-start" : "justify-end",
                )}
              >
                <Skeleton className="h-10 w-48 rounded-2xl" />
              </div>
            ))}
          </div>
        ) : !messages || messages.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No messages yet. Say hello! 👋</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMine = msg.from?.toString() === myPrincipal;
            return (
              <div
                key={msg.timestamp?.toString() ?? `msg-${i}`}
                className={cn("flex", isMine ? "justify-end" : "justify-start")}
              >
                <MessageBubble
                  content={msg.content}
                  isMine={isMine}
                  timestamp={msg.timestamp}
                />
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Attachment menu */}
      {showAttachMenu && (
        <div
          className="glass border-t border-border px-4 py-4 grid grid-cols-5 gap-2"
          data-ocid="chat.attach.panel"
        >
          <button
            type="button"
            onClick={() => {
              setShowAttachMenu(false);
              setShowInlineCamera(true);
              inlineCamera.startCamera();
            }}
            data-ocid="chat.attach.camera_button"
            className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-accent transition-colors"
          >
            <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs text-muted-foreground">Camera</span>
          </button>

          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            data-ocid="chat.attach.photo_button"
            className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-accent transition-colors"
          >
            <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center">
              <Image className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs text-muted-foreground">Gallery</span>
          </button>

          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            data-ocid="chat.attach.video_button"
            className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-accent transition-colors"
          >
            <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center">
              <Video className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs text-muted-foreground">Video</span>
          </button>

          <button
            type="button"
            onClick={() => audioInputRef.current?.click()}
            data-ocid="chat.attach.audio_button"
            className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-accent transition-colors"
          >
            <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center">
              <Music className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs text-muted-foreground">Audio</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAttachMenu(false)}
            data-ocid="chat.attach.close_button"
            className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-accent transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <X className="w-5 h-5 text-muted-foreground" />
            </div>
            <span className="text-xs text-muted-foreground">Close</span>
          </button>
        </div>
      )}

      {/* Hidden inputs */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileInput(e, "image")}
        data-ocid="chat.photo_input"
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => handleFileInput(e, "video")}
        data-ocid="chat.video_input"
      />
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => handleFileInput(e, "audio")}
        data-ocid="chat.audio_input"
      />

      {/* Input bar */}
      <div className="glass border-t border-border px-3 py-3 flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowAttachMenu((v) => !v)}
          className="shrink-0 text-muted-foreground hover:text-primary"
          data-ocid="chat.attach_button"
        >
          <Paperclip className="w-5 h-5" />
        </Button>

        {!isRecordingVoice && (
          <Input
            data-ocid="messages.input"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
        )}

        {isRecordingVoice && (
          <div className="flex-1 flex items-center gap-3 px-3 py-2 bg-red-500/10 rounded-full border border-red-400/30">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-mono text-red-600 dark:text-red-400">
              {formatVoiceTime(voiceTime)}
            </span>
            <span className="text-xs text-muted-foreground">Recording...</span>
          </div>
        )}

        {!message.trim() && (
          <Button
            variant={isRecordingVoice ? "destructive" : "ghost"}
            size="icon"
            className="shrink-0"
            onMouseDown={startVoiceRecording}
            onMouseUp={stopVoiceRecording}
            onTouchStart={startVoiceRecording}
            onTouchEnd={stopVoiceRecording}
            data-ocid="chat.voice_button"
          >
            <Mic className="w-5 h-5" />
          </Button>
        )}

        {message.trim() && (
          <Button
            data-ocid="messages.send_button"
            onClick={() => handleSend()}
            disabled={!message.trim() || sendMessage.isPending}
            className="gradient-primary text-white border-0 shrink-0"
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
