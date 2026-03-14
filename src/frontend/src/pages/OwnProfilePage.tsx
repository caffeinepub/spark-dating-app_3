import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Camera, Plus, Save, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Gender } from "../backend.d";
import type { Profile } from "../backend.d";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useSaveProfile } from "../hooks/useQueries";

export default function OwnProfilePage() {
  const { identity } = useInternetIdentity();
  const { actor } = useActor();
  const saveProfile = useSaveProfile();
  const fileRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [photoLink, setPhotoLink] = useState("");
  const [photoPreview, setPhotoPreview] = useState("");
  const [gender, setGender] = useState<Gender>(Gender.other);
  const [genderPreference, setGenderPreference] = useState<Gender>(
    Gender.other,
  );
  const [interestInput, setInterestInput] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
    setPhotoLink(url);
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
      id: 0n,
      displayName: displayName.trim(),
      photoLink,
      gender,
      genderPreference,
      interests: interests.map((name, idx) => ({ id: BigInt(idx), name })),
      isActive: true,
      lastActive: BigInt(Date.now()) * 1_000_000n,
      principal: identity.getPrincipal(),
    };
    saveProfile.mutate(profile, {
      onSuccess: () => {
        toast.success("Profile saved!");
        setIsSaving(false);
      },
      onError: () => {
        toast.error("Failed to save profile.");
        setIsSaving(false);
      },
    });
  };

  return (
    <div className="container mx-auto max-w-lg px-4 py-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold mb-1">Edit Profile</h1>
        <p className="text-muted-foreground">Make yourself shine ✨</p>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-card p-6 space-y-6">
        {/* Photo upload */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-28 h-28 rounded-full gradient-soft overflow-hidden flex items-center justify-center">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="font-display text-4xl text-white/80">
                  {displayName?.charAt(0)?.toUpperCase() ?? "?"}
                </span>
              )}
            </div>
            <button
              type="button"
              data-ocid="profile.photo_upload_button"
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-0 right-0 w-9 h-9 rounded-full gradient-primary flex items-center justify-center shadow-glow"
            >
              <Camera className="w-4 h-4 text-white" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoSelect}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Click the camera to change your photo
          </p>
        </div>

        {/* Display name */}
        <div className="space-y-1.5">
          <Label>Display Name</Label>
          <Input
            data-ocid="profile.input"
            placeholder="Your name..."
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>

        {/* Gender */}
        <div className="space-y-1.5">
          <Label>I am</Label>
          <Select value={gender} onValueChange={(v) => setGender(v as Gender)}>
            <SelectTrigger data-ocid="profile.select">
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={Gender.female}>Woman</SelectItem>
              <SelectItem value={Gender.male}>Man</SelectItem>
              <SelectItem value={Gender.other}>Non-binary / Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Gender preference */}
        <div className="space-y-1.5">
          <Label>Interested in</Label>
          <Select
            value={genderPreference}
            onValueChange={(v) => setGenderPreference(v as Gender)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select preference" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={Gender.female}>Women</SelectItem>
              <SelectItem value={Gender.male}>Men</SelectItem>
              <SelectItem value={Gender.other}>Everyone</SelectItem>
            </SelectContent>
          </Select>
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
                className="gradient-soft text-accent-foreground border-0 pr-1 gap-1"
              >
                {name}
                <button
                  type="button"
                  onClick={() => removeInterest(name)}
                  className="ml-1 hover:text-destructive"
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
      </div>
    </div>
  );
}
