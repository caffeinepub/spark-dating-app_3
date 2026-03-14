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
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  Flame,
  Plus,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Gender } from "../backend.d";
import type { Profile } from "../backend.d";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useSaveProfile } from "../hooks/useQueries";

const STEPS = [
  { id: 1, label: "Your Name" },
  { id: 2, label: "Photo" },
  { id: 3, label: "About You" },
];

const INTEREST_SUGGESTIONS = [
  "Travel",
  "Music",
  "Cooking",
  "Fitness",
  "Art",
  "Gaming",
  "Reading",
  "Coffee",
  "Hiking",
  "Photography",
  "Movies",
  "Dancing",
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { identity } = useInternetIdentity();
  const saveProfile = useSaveProfile();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
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

  const addInterest = (name?: string) => {
    const trimmed = (name ?? interestInput).trim();
    if (!trimmed || interests.includes(trimmed)) return;
    setInterests((prev) => [...prev, trimmed]);
    setInterestInput("");
  };

  const removeInterest = (name: string) => {
    setInterests((prev) => prev.filter((i) => i !== name));
  };

  const canProceed = () => {
    if (step === 1) return displayName.trim().length >= 2;
    return true;
  };

  const handleFinish = async () => {
    if (!displayName.trim()) {
      toast.error("Please enter your name.");
      return;
    }
    if (!identity) {
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
        toast.success("Profile saved! Time to find your spark ✨");
        navigate({ to: "/discover" });
      },
      onError: () => {
        toast.error("Failed to save profile. Please try again.");
        setIsSaving(false);
      },
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-12">
      {/* Brand mark */}
      <div className="flex items-center gap-2 mb-10">
        <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center shadow-glow">
          <Flame className="w-5 h-5 text-white" />
        </div>
        <span className="font-display font-bold text-2xl gradient-text">
          Spark
        </span>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                step > s.id
                  ? "gradient-primary text-white shadow-glow"
                  : step === s.id
                    ? "border-2 border-primary text-primary"
                    : "border-2 border-border text-muted-foreground"
              }`}
            >
              {step > s.id ? <Check className="w-4 h-4" /> : s.id}
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`w-10 h-0.5 transition-all duration-300 ${
                  step > s.id ? "gradient-primary" : "bg-border"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-card overflow-hidden">
        {/* Step header */}
        <div className="gradient-soft px-6 py-4 border-b border-border">
          <p className="text-xs font-semibold text-primary tracking-widest uppercase">
            Step {step} of {STEPS.length}
          </p>
          <h1 className="font-display text-xl font-bold mt-0.5">
            {step === 1 && "What's your name?"}
            {step === 2 && "Add a profile photo"}
            {step === 3 && "Tell us about yourself"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {step === 1 && "This is how others will see you."}
            {step === 2 && "A photo helps you get more matches."}
            {step === 3 && "Help us find the right people for you."}
          </p>
        </div>

        <div className="p-6 space-y-5">
          {/* Step 1: Display Name */}
          {step === 1 && (
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                data-ocid="onboarding.input"
                placeholder="e.g. Priya, Alex, Morgan..."
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && canProceed() && setStep(2)
                }
                autoFocus
                className="text-lg"
              />
              {displayName.length > 0 && displayName.trim().length < 2 && (
                <p className="text-xs text-destructive">
                  Name must be at least 2 characters.
                </p>
              )}
            </div>
          )}

          {/* Step 2: Photo */}
          {step === 2 && (
            <div className="flex flex-col items-center gap-4">
              <button
                type="button"
                className="relative w-36 h-36 rounded-full overflow-hidden cursor-pointer group focus:outline-none focus:ring-2 focus:ring-primary"
                onClick={() => fileRef.current?.click()}
                aria-label="Upload profile photo"
              >
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Profile preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full gradient-soft flex items-center justify-center">
                    <span className="font-display text-5xl text-primary">
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="w-8 h-8 text-white" />
                </div>
              </button>
              <Button
                data-ocid="onboarding.upload_button"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                className="gap-2"
              >
                <Camera className="w-4 h-4" />
                {photoPreview ? "Change Photo" : "Upload Photo"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                You can skip this step and add a photo later from your profile.
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoSelect}
              />
            </div>
          )}

          {/* Step 3: Gender + Interests */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <Label>I am</Label>
                <Select
                  value={gender}
                  onValueChange={(v) => setGender(v as Gender)}
                >
                  <SelectTrigger data-ocid="onboarding.gender.select">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={Gender.female}>Woman</SelectItem>
                    <SelectItem value={Gender.male}>Man</SelectItem>
                    <SelectItem value={Gender.other}>
                      Non-binary / Other
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Interested in</Label>
                <Select
                  value={genderPreference}
                  onValueChange={(v) => setGenderPreference(v as Gender)}
                >
                  <SelectTrigger data-ocid="onboarding.preference.select">
                    <SelectValue placeholder="Select preference" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={Gender.female}>Women</SelectItem>
                    <SelectItem value={Gender.male}>Men</SelectItem>
                    <SelectItem value={Gender.other}>Everyone</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Interests (optional)</Label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {INTEREST_SUGGESTIONS.filter(
                    (s) => !interests.includes(s),
                  ).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => addInterest(s)}
                      className="text-xs px-2.5 py-1 rounded-full border border-border hover:border-primary hover:text-primary transition-colors"
                    >
                      + {s}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    data-ocid="onboarding.interests.input"
                    placeholder="Add custom interest..."
                    value={interestInput}
                    onChange={(e) => setInterestInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addInterest()}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => addInterest()}
                    size="icon"
                    variant="outline"
                    data-ocid="onboarding.interests.button"
                  >
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
            </div>
          )}
        </div>

        {/* Navigation footer */}
        <div className="px-6 pb-6 flex items-center justify-between gap-3">
          {step > 1 ? (
            <Button
              data-ocid="onboarding.back.button"
              variant="ghost"
              onClick={() => setStep((s) => s - 1)}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          ) : (
            <div />
          )}

          {step < STEPS.length ? (
            <Button
              data-ocid="onboarding.next.button"
              disabled={!canProceed()}
              onClick={() => setStep((s) => s + 1)}
              className="gradient-primary text-white border-0 shadow-glow gap-2"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              data-ocid="onboarding.submit_button"
              disabled={isSaving || saveProfile.isPending}
              onClick={handleFinish}
              className="gradient-primary text-white border-0 shadow-glow gap-2"
            >
              {isSaving || saveProfile.isPending ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Flame className="w-4 h-4" />
                  Find My Spark!
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
