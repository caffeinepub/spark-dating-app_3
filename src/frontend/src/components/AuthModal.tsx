import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Flame,
  Loader2,
  Lock,
  User,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useActor } from "../hooks/useActor";
import { getPasswordStrength, hashPassword } from "../utils/crypto";

interface AuthModalProps {
  open: boolean;
  defaultTab?: "signin" | "signup";
  onSuccess: () => void;
}

const VALID_USERNAME_RE = /^[a-zA-Z0-9_]+$/;
const EXAMPLE_USERNAMES = ["rahul_123", "priya2024", "spark_user"];

export default function AuthModal({
  open,
  defaultTab = "signup",
  onSuccess,
}: AuthModalProps) {
  const { actor } = useActor();
  const extActor = actor as any;

  // Sign Up state
  const [suUsername, setSuUsername] = useState("");
  const [suPassword, setSuPassword] = useState("");
  const [suConfirm, setSuConfirm] = useState("");
  const [suShowPw, setSuShowPw] = useState(false);
  const [suShowConfirm, setSuShowConfirm] = useState(false);
  const [suLoading, setSuLoading] = useState(false);
  const [suError, setSuError] = useState("");

  // Sign In state
  const [siUsername, setSiUsername] = useState("");
  const [siPassword, setSiPassword] = useState("");
  const [siShowPw, setSiShowPw] = useState(false);
  const [siLoading, setSiLoading] = useState(false);
  const [siError, setSiError] = useState("");

  const strength = getPasswordStrength(suPassword);

  // Username validation states
  const usernameHasInput = suUsername.length > 0;
  const usernameValid =
    usernameHasInput &&
    VALID_USERNAME_RE.test(suUsername) &&
    suUsername.length >= 3;
  const usernameHasInvalidChars =
    usernameHasInput && !VALID_USERNAME_RE.test(suUsername);

  const handleSignUp = async () => {
    setSuError("");
    if (!suUsername.trim() || suUsername.length < 3) {
      setSuError("Username must be at least 3 characters.");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(suUsername)) {
      setSuError(
        "Username can only contain letters, numbers, and underscores.",
      );
      return;
    }
    if (suPassword.length < 8) {
      setSuError("Password must be at least 8 characters.");
      return;
    }
    if (suPassword !== suConfirm) {
      setSuError("Passwords do not match.");
      return;
    }
    if (!extActor) {
      setSuError("App is still loading. Please wait a moment and try again.");
      return;
    }
    setSuLoading(true);
    try {
      const hash = await hashPassword(suPassword);
      const result = await extActor.registerWithCredentials(
        suUsername.trim(),
        hash,
      );
      if (result && "ok" in result) {
        toast.success("Account created! Welcome to Spark 🎉");
        onSuccess();
      } else if (result && "usernameTaken" in result) {
        setSuError("That username is already taken. Try another!");
      } else if (result && "alreadyRegistered" in result) {
        setSuError("You already have an account. Please sign in instead.");
      } else {
        setSuError("Unexpected response from server. Please try again.");
      }
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : typeof e === "string"
            ? e
            : "Unknown error";
      // Show a user-friendly message but also log for debugging
      console.error("[Spark] registerWithCredentials error:", msg);
      if (
        msg.toLowerCase().includes("not registered") ||
        msg.toLowerCase().includes("unauthorized")
      ) {
        setSuError(
          "Authentication error. Please refresh the page and try again.",
        );
      } else if (
        msg.toLowerCase().includes("network") ||
        msg.toLowerCase().includes("fetch")
      ) {
        setSuError(
          "Network error. Please check your connection and try again.",
        );
      } else {
        setSuError(`Account creation failed: ${msg}`);
      }
    } finally {
      setSuLoading(false);
    }
  };

  const handleSignIn = async () => {
    setSiError("");
    if (!siUsername.trim()) {
      setSiError("Please enter your username.");
      return;
    }
    if (!siPassword) {
      setSiError("Please enter your password.");
      return;
    }
    if (!extActor) {
      setSiError("App is still loading. Please wait a moment and try again.");
      return;
    }
    setSiLoading(true);
    try {
      const hash = await hashPassword(siPassword);
      const ok = await extActor.loginWithCredentials(siUsername.trim(), hash);
      if (ok) {
        toast.success("Welcome back! 💕");
        onSuccess();
      } else {
        setSiError("Invalid username or password. Please try again.");
      }
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : typeof e === "string"
            ? e
            : "Unknown error";
      console.error("[Spark] loginWithCredentials error:", msg);
      setSiError(`Login failed: ${msg}`);
    } finally {
      setSiLoading(false);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent
        data-ocid="auth.dialog"
        className="sm:max-w-md p-0 overflow-hidden border-0 shadow-2xl"
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Gradient header */}
        <div className="gradient-primary px-6 pt-8 pb-6 text-white text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Flame className="w-5 h-5 text-white" />
            </div>
          </div>
          <DialogHeader>
            <DialogTitle className="text-2xl font-display font-bold text-white">
              Welcome to Spark
            </DialogTitle>
          </DialogHeader>
          <p className="text-white/70 text-sm mt-1">
            Find your flame — create your account or sign in
          </p>
        </div>

        <div className="p-6">
          <Tabs defaultValue={defaultTab}>
            <TabsList data-ocid="auth.tab" className="w-full mb-6 bg-muted">
              <TabsTrigger
                data-ocid="auth.signup.tab"
                value="signup"
                className="flex-1 data-[state=active]:gradient-primary data-[state=active]:text-white"
              >
                Create Account
              </TabsTrigger>
              <TabsTrigger
                data-ocid="auth.signin.tab"
                value="signin"
                className="flex-1 data-[state=active]:gradient-primary data-[state=active]:text-white"
              >
                Sign In
              </TabsTrigger>
            </TabsList>

            {/* ── Sign Up Tab ── */}
            <TabsContent value="signup" className="space-y-4 mt-0">
              <div className="space-y-1.5">
                <Label htmlFor="su-username">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="su-username"
                    data-ocid="auth.signup.input"
                    placeholder="your_username"
                    value={suUsername}
                    onChange={(e) => setSuUsername(e.target.value)}
                    className={`pl-9 pr-9 transition-colors ${
                      usernameHasInvalidChars
                        ? "border-destructive focus-visible:ring-destructive/30"
                        : usernameValid
                          ? "border-emerald-500 focus-visible:ring-emerald-500/30"
                          : ""
                    }`}
                    autoComplete="username"
                    disabled={suLoading}
                  />
                  {/* Real-time validity indicator */}
                  {usernameHasInput && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2">
                      {usernameValid ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-destructive" />
                      )}
                    </span>
                  )}
                </div>

                {/* Inline error for invalid characters */}
                {usernameHasInvalidChars && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    ❌ Special characters (@, -, space, etc.) not allowed
                  </p>
                )}

                {/* Hint with example chips */}
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">
                    Letters, numbers, and underscores only (min 3 chars).
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-muted-foreground">e.g.</span>
                    {EXAMPLE_USERNAMES.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setSuUsername(name)}
                        className="text-xs px-2 py-0.5 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border/60 font-mono transition-colors cursor-pointer"
                        tabIndex={-1}
                        title={`Use ${name}`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="su-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="su-password"
                    data-ocid="auth.signup.password.input"
                    type={suShowPw ? "text" : "password"}
                    placeholder="At least 8 characters"
                    value={suPassword}
                    onChange={(e) => setSuPassword(e.target.value)}
                    className="pl-9 pr-10"
                    autoComplete="new-password"
                    disabled={suLoading}
                  />
                  <button
                    type="button"
                    data-ocid="auth.signup.password.toggle"
                    onClick={() => setSuShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {suShowPw ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {/* Password strength bar */}
                {suPassword.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                            i <= strength.score ? strength.color : "bg-muted"
                          }`}
                        />
                      ))}
                    </div>
                    <p
                      className={`text-xs ${
                        strength.score >= 3
                          ? "text-emerald-600"
                          : strength.score >= 2
                            ? "text-yellow-600"
                            : "text-destructive"
                      }`}
                    >
                      {strength.label}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="su-confirm">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="su-confirm"
                    data-ocid="auth.signup.confirm.input"
                    type={suShowConfirm ? "text" : "password"}
                    placeholder="Repeat password"
                    value={suConfirm}
                    onChange={(e) => setSuConfirm(e.target.value)}
                    className="pl-9 pr-10"
                    autoComplete="new-password"
                    disabled={suLoading}
                    onKeyDown={(e) => e.key === "Enter" && handleSignUp()}
                  />
                  <button
                    type="button"
                    data-ocid="auth.signup.confirm.toggle"
                    onClick={() => setSuShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {suShowConfirm ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {suConfirm.length > 0 && suPassword !== suConfirm && (
                  <p className="text-xs text-destructive">
                    Passwords don't match.
                  </p>
                )}
              </div>

              {suError && (
                <div
                  data-ocid="auth.signup.error_state"
                  className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2"
                >
                  {suError}
                </div>
              )}

              <Button
                data-ocid="auth.signup.submit_button"
                onClick={handleSignUp}
                disabled={suLoading || !extActor}
                className="w-full gradient-primary text-white border-0 shadow-glow font-semibold"
                size="lg"
              >
                {suLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating account...
                  </>
                ) : !extActor ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "✨ Create My Account"
                )}
              </Button>
            </TabsContent>

            {/* ── Sign In Tab ── */}
            <TabsContent value="signin" className="space-y-4 mt-0">
              <div className="space-y-1.5">
                <Label htmlFor="si-username">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="si-username"
                    data-ocid="auth.signin.input"
                    placeholder="your_username"
                    value={siUsername}
                    onChange={(e) => setSiUsername(e.target.value)}
                    className="pl-9"
                    autoComplete="username"
                    disabled={siLoading}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="si-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="si-password"
                    data-ocid="auth.signin.password.input"
                    type={siShowPw ? "text" : "password"}
                    placeholder="Your password"
                    value={siPassword}
                    onChange={(e) => setSiPassword(e.target.value)}
                    className="pl-9 pr-10"
                    autoComplete="current-password"
                    disabled={siLoading}
                    onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
                  />
                  <button
                    type="button"
                    data-ocid="auth.signin.password.toggle"
                    onClick={() => setSiShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {siShowPw ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {siError && (
                <div
                  data-ocid="auth.signin.error_state"
                  className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2"
                >
                  {siError}
                </div>
              )}

              <Button
                data-ocid="auth.signin.submit_button"
                onClick={handleSignIn}
                disabled={siLoading || !extActor}
                className="w-full gradient-primary text-white border-0 shadow-glow font-semibold"
                size="lg"
              >
                {siLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In →"
                )}
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
