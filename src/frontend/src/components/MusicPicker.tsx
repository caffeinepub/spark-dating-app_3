import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Music, Pause, Play, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SONG_LIBRARY, type Song } from "../data/songLibrary";

export interface SelectedMusic {
  audioId: string;
  songName: string;
  artistName: string;
}

interface MusicPickerProps {
  selected: SelectedMusic | null;
  onSelect: (music: SelectedMusic | null) => void;
}

export default function MusicPicker({ selected, onSelect }: MusicPickerProps) {
  const [open, setOpen] = useState(false);
  const [previewSongId, setPreviewSongId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!open) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPreviewSongId(null);
    }
  }, [open]);

  const playPreview = (song: Song) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (previewSongId === song.id) {
      setPreviewSongId(null);
      return;
    }
    const audio = new Audio(song.url);
    audio.play().catch(() => {});
    audioRef.current = audio;
    setPreviewSongId(song.id);
    audio.onended = () => setPreviewSongId(null);
  };

  const selectSong = (song: Song) => {
    onSelect({
      audioId: song.url,
      songName: song.name,
      artistName: song.artist,
    });
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPreviewSongId(null);
    setOpen(false);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    onSelect({
      audioId: url,
      songName: file.name.replace(/\.[^.]+$/, ""),
      artistName: "My Upload",
    });
    setOpen(false);
  };

  const removeMusic = () => {
    onSelect(null);
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      {!selected && (
        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen((v) => !v)}
          className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/5"
          data-ocid="create.music.button"
        >
          <Music className="w-4 h-4" />
          Add Music
        </Button>
      )}

      {selected && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl gradient-soft border border-primary/20">
          <Music
            className="w-4 h-4 text-primary flex-shrink-0"
            style={{ animation: "spin 3s linear infinite" }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-primary truncate">
              {selected.songName}
            </p>
            <p className="text-xs text-muted-foreground">
              {selected.artistName}
            </p>
          </div>
          <button
            type="button"
            onClick={removeMusic}
            className="text-muted-foreground hover:text-destructive transition-colors"
            data-ocid="create.music.remove_button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {selected && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen((v) => !v)}
          className="w-full text-primary/70 hover:text-primary text-xs"
        >
          Change Music
        </Button>
      )}

      {open && (
        <div className="border border-border rounded-xl overflow-hidden bg-card shadow-lg">
          <Tabs defaultValue="library">
            <TabsList className="w-full rounded-none border-b border-border bg-muted/50">
              <TabsTrigger value="library" className="flex-1 text-xs">
                🎵 Library
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex-1 text-xs">
                ⬆ Upload
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="library"
              className="p-2 space-y-1 max-h-56 overflow-y-auto"
            >
              {SONG_LIBRARY.map((song) => {
                const isSelected = selected?.audioId === song.url;
                const isPreviewing = previewSongId === song.id;
                return (
                  <div
                    key={song.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? "gradient-soft border border-primary/30"
                        : "hover:bg-accent"
                    }`}
                    onClick={() => selectSong(song)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") selectSong(song);
                    }}
                    // biome-ignore lint/a11y/useSemanticElements: list item with click
                    role="button"
                    tabIndex={0}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        playPreview(song);
                      }}
                      className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors flex-shrink-0"
                    >
                      {isPreviewing ? (
                        <Pause className="w-3.5 h-3.5" />
                      ) : (
                        <Play className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {song.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {song.artist}
                      </p>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </TabsContent>

            <TabsContent value="upload" className="p-4">
              <label
                className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 hover:bg-accent/50 transition-colors"
                data-ocid="create.music.upload_button"
              >
                <div className="w-12 h-12 rounded-full gradient-soft flex items-center justify-center">
                  <Upload className="w-5 h-5 text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">Upload your audio</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    MP3, WAV, M4A supported
                  </p>
                </div>
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={handleUpload}
                />
              </label>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}

export function MusicSticker({
  songName,
  artistName,
}: { songName: string; artistName: string }) {
  return (
    <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2.5 py-1.5 rounded-full max-w-[80%]">
      <Music
        className="w-3 h-3 text-pink-400 flex-shrink-0"
        style={{ animation: "spin 3s linear infinite" }}
      />
      <span className="text-white text-xs truncate">
        ♪ {songName} · {artistName}
      </span>
    </div>
  );
}
