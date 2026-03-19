import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import {
  Camera,
  Circle,
  FlipHorizontal,
  Loader2,
  Square,
  Video,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useCamera } from "../camera/useCamera";

type CaptureMode = "photo" | "video";

function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function CameraPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<CaptureMode>("photo");
  const [isMobile, setIsMobile] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [capturedURL, setCapturedURL] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    isActive,
    isSupported,
    error,
    isLoading,
    startCamera,
    stopCamera,
    switchCamera,
    capturePhoto,
    videoRef,
    canvasRef,
  } = useCamera({ facingMode: "environment" });

  useEffect(() => {
    const checkMobile = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === "videoinput");
        setIsMobile(videoDevices.length > 1);
      } catch {
        setIsMobile(false);
      }
    };
    void checkMobile();
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: start once on mount
  useEffect(() => {
    if (isSupported) void startCamera();
    return () => {
      stopCamera();
    };
  }, [isSupported]);

  const handleCapture = useCallback(async () => {
    if (!isActive || isLoading) return;
    if (mode === "photo") {
      const file = await capturePhoto();
      if (file) {
        const url = await fileToDataURL(file);
        setCapturedFile(file);
        setCapturedURL(url);
      } else {
        toast.error("Failed to capture photo");
      }
    }
  }, [isActive, isLoading, mode, capturePhoto]);

  const startRecording = useCallback(() => {
    const stream = (videoRef.current?.srcObject as MediaStream) ?? null;
    if (!stream || isRecording) return;
    chunksRef.current = [];
    const mr = new MediaRecorder(stream, { mimeType: "video/webm" });
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    mr.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const file = new File([blob], `video_${Date.now()}.webm`, {
        type: "video/webm",
      });
      const url = URL.createObjectURL(blob);
      setCapturedFile(file);
      setCapturedURL(url);
    };
    mr.start();
    mediaRecorderRef.current = mr;
    setIsRecording(true);
    setRecordingTime(0);
    timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
  }, [isRecording, videoRef]);

  const stopRecording = useCallback(() => {
    if (!isRecording) return;
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, [isRecording]);

  const handleDiscard = () => {
    if (capturedURL && capturedFile?.type.startsWith("video")) {
      URL.revokeObjectURL(capturedURL);
    }
    setCapturedFile(null);
    setCapturedURL(null);
  };

  const handleAction = (target: "story" | "reel" | "post" | "chat") => {
    if (!capturedFile) return;
    if (target === "chat") {
      navigate({ to: "/messages" });
    } else {
      toast.success(
        `Ready to post as ${target}! Go to Feed to create a ${target}.`,
      );
      navigate({ to: "/feed" });
    }
  };

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex flex-col"
      data-ocid="camera.page"
    >
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4">
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20 rounded-full"
          onClick={() => {
            stopCamera();
            navigate({ to: "/feed" });
          }}
          data-ocid="camera.close_button"
        >
          <X className="w-6 h-6" />
        </Button>

        {isRecording && (
          <div className="flex items-center gap-2 bg-black/50 rounded-full px-3 py-1">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-white text-sm font-mono">
              {formatTime(recordingTime)}
            </span>
          </div>
        )}

        {isMobile && isActive ? (
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 rounded-full"
            onClick={() => switchCamera()}
            disabled={isLoading}
            data-ocid="camera.flip_button"
          >
            <FlipHorizontal className="w-6 h-6" />
          </Button>
        ) : (
          <div className="w-10" />
        )}
      </div>

      {/* Preview area */}
      <div className="flex-1 relative overflow-hidden">
        {!capturedFile && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
            style={{ transform: "scaleX(-1)" }}
          />
        )}
        <canvas ref={canvasRef} className="hidden" />

        {capturedFile && capturedURL && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            {capturedFile.type.startsWith("image") ? (
              <img
                src={capturedURL}
                alt="Captured"
                className="w-full h-full object-contain"
              />
            ) : (
              // biome-ignore lint/a11y/useMediaCaption: recorded video preview
              <video
                src={capturedURL}
                controls
                autoPlay
                loop
                className="w-full h-full object-contain"
              />
            )}
          </div>
        )}

        {isLoading && !capturedFile && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <Loader2 className="w-10 h-10 text-white animate-spin" />
          </div>
        )}

        {error && !capturedFile && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white text-center p-8">
            <Camera className="w-16 h-16 mb-4 text-white/50" />
            <p className="text-lg font-semibold mb-2">Camera unavailable</p>
            <p className="text-sm text-white/70 mb-6">{error.message}</p>
            <Button
              onClick={() => startCamera()}
              className="gradient-primary text-white border-0"
              data-ocid="camera.retry_button"
            >
              Try Again
            </Button>
          </div>
        )}

        {isSupported === false && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black text-white text-center p-8">
            <Camera className="w-16 h-16 mb-4 text-white/50" />
            <p className="text-lg font-semibold">
              Camera not supported on this device
            </p>
          </div>
        )}
      </div>

      {/* Post-capture action sheet */}
      {capturedFile && capturedURL && (
        <div
          className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 to-transparent"
          data-ocid="camera.action.panel"
        >
          <p className="text-white text-center text-sm font-medium mb-4">
            Share as
          </p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {(["story", "reel", "post", "chat"] as const).map((t) => (
              <Button
                key={t}
                onClick={() => handleAction(t)}
                className="gradient-primary text-white border-0 capitalize"
                data-ocid={`camera.${t}_button`}
              >
                {t === "chat" ? "Send in Chat" : `Post as ${t}`}
              </Button>
            ))}
          </div>
          <Button
            variant="ghost"
            className="w-full text-white hover:bg-white/20"
            onClick={handleDiscard}
            data-ocid="camera.discard_button"
          >
            Discard
          </Button>
        </div>
      )}

      {/* Capture controls */}
      {!capturedFile && (
        <div className="absolute bottom-0 left-0 right-0 pb-10 flex flex-col items-center gap-4">
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => setMode("photo")}
              className={cn(
                "text-sm font-semibold transition-colors",
                mode === "photo" ? "text-white" : "text-white/50",
              )}
              data-ocid="camera.photo_tab"
            >
              PHOTO
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("video");
                if (isRecording) stopRecording();
              }}
              className={cn(
                "text-sm font-semibold transition-colors",
                mode === "video" ? "text-white" : "text-white/50",
              )}
              data-ocid="camera.video_tab"
            >
              VIDEO
            </button>
          </div>

          <button
            type="button"
            disabled={!isActive || isLoading}
            onClick={mode === "photo" ? handleCapture : undefined}
            onMouseDown={mode === "video" ? startRecording : undefined}
            onMouseUp={mode === "video" ? stopRecording : undefined}
            onTouchStart={mode === "video" ? startRecording : undefined}
            onTouchEnd={mode === "video" ? stopRecording : undefined}
            data-ocid="camera.capture_button"
            className={cn(
              "w-20 h-20 rounded-full border-4 border-white flex items-center justify-center transition-all",
              !isActive || isLoading
                ? "opacity-40 cursor-not-allowed"
                : "hover:scale-95 active:scale-90",
              isRecording ? "bg-red-500 border-red-300" : "bg-white/20",
            )}
          >
            {mode === "photo" ? (
              <Circle className="w-12 h-12 text-white" />
            ) : isRecording ? (
              <Square className="w-8 h-8 text-white" />
            ) : (
              <Video className="w-8 h-8 text-white" />
            )}
          </button>
          {mode === "video" && !isRecording && (
            <p className="text-white/60 text-xs">Hold to record</p>
          )}
        </div>
      )}
    </div>
  );
}
