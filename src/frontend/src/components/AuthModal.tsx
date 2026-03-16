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
const EXAMPLE_USERNAMES = ["rahul_123", "priya2024", "nibba_nibbi"];

// ── Forgot Password Dialog ───────────────────────────────────────────────────
function ForgotPasswordDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { actor } = useActor();
  const extActor = actor as any;

  // Mobile OTP state
  const [otpUsername, setOtpUsername] = useState("");
  const [otpCode, setOtpCode] = useState(""); // generated OTP
  const [otpEntered, setOtpEntered] = useState("");
  const [otpNewPw, setOtpNewPw] = useState("");
  const [otpConfirmPw, setOtpConfirmPw] = useState("");
  const [otpStep, setOtpStep] = useState(1); // 1=username, 2=show/enter otp, 3=new pw
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");

  // Security Question state
  const [sqUsername, setSqUsername] = useState("");
  const [sqQuestion, setSqQuestion] = useState("");
  const [sqAnswer, setSqAnswer] = useState("");
  const [sqOtp, setSqOtp] = useState(""); // returned from verifySecurityAnswer
  const [sqNewPw, setSqNewPw] = useState("");
  const [sqConfirmPw, setSqConfirmPw] = useState("");
  const [sqStep, setSqStep] = useState(1); // 1=username, 2=answer, 3=new pw
  const [sqLoading, setSqLoading] = useState(false);
  const [sqError, setSqError] = useState("");

  // Admin Reset state
  const [arUsername, setArUsername] = useState("");
  const [arLoading, setArLoading] = useState(false);
  const [arError, setArError] = useState("");
  const [arSuccess, setArSuccess] = useState(false);

  const resetAll = () => {
    setOtpUsername("");
    setOtpCode("");
    setOtpEntered("");
    setOtpNewPw("");
    setOtpConfirmPw("");
    setOtpStep(1);
    setOtpError("");
    setSqUsername("");
    setSqQuestion("");
    setSqAnswer("");
    setSqOtp("");
    setSqNewPw("");
    setSqConfirmPw("");
    setSqStep(1);
    setSqError("");
    setArUsername("");
    setArError("");
    setArSuccess(false);
  };

  const handleClose = () => {
    resetAll();
    onClose();
  };

  // ── Mobile OTP Handlers ──
  const handleOtpVerifyUser = async () => {
    setOtpError("");
    if (!otpUsername.trim()) {
      setOtpError("Username daalna zaroori hai.");
      return;
    }
    setOtpLoading(true);
    try {
      const q = await extActor.getSecurityQuestion(otpUsername.trim());
      if (q === null || q === undefined) {
        setOtpError("Username nahi mila. Dobara check karein.");
        return;
      }
      // Generate random 6-digit OTP
      const generated = String(Math.floor(100000 + Math.random() * 900000));
      setOtpCode(generated);
      setOtpStep(2);
    } catch {
      setOtpError("Error hua. Dobara try karein.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleOtpVerifyCode = () => {
    setOtpError("");
    if (otpEntered.trim() !== otpCode) {
      setOtpError("OTP sahi nahi hai.");
      return;
    }
    setOtpStep(3);
  };

  const handleOtpReset = async () => {
    setOtpError("");
    if (otpNewPw.length < 8) {
      setOtpError("Password kam se kam 8 characters ka hona chahiye.");
      return;
    }
    if (otpNewPw !== otpConfirmPw) {
      setOtpError("Passwords match nahi kar rahe.");
      return;
    }
    setOtpLoading(true);
    try {
      const hash = await hashPassword(otpNewPw);
      const ok = await extActor.resetPasswordWithOtp(
        otpUsername.trim(),
        "123456",
        hash,
      );
      if (ok) {
        toast.success("Password reset ho gaya! Ab sign in karein.");
        handleClose();
      } else {
        setOtpError("Password reset fail hua. Dobara try karein.");
      }
    } catch {
      setOtpError("Error hua. Dobara try karein.");
    } finally {
      setOtpLoading(false);
    }
  };

  // ── Security Question Handlers ──
  const handleSqGetQuestion = async () => {
    setSqError("");
    if (!sqUsername.trim()) {
      setSqError("Username daalna zaroori hai.");
      return;
    }
    setSqLoading(true);
    try {
      const q = await extActor.getSecurityQuestion(sqUsername.trim());
      if (!q) {
        setSqError("Username nahi mila ya security question set nahi hai.");
        return;
      }
      setSqQuestion(q);
      setSqStep(2);
    } catch {
      setSqError("Error hua. Dobara try karein.");
    } finally {
      setSqLoading(false);
    }
  };

  const handleSqVerifyAnswer = async () => {
    setSqError("");
    if (!sqAnswer.trim()) {
      setSqError("Answer daalna zaroori hai.");
      return;
    }
    setSqLoading(true);
    try {
      const ansHash = await hashPassword(sqAnswer.trim());
      const result = await extActor.verifySecurityAnswer(
        sqUsername.trim(),
        ansHash,
      );
      if (!result) {
        setSqError("Jawab galat hai. Dobara try karein.");
        return;
      }
      setSqOtp(result);
      setSqStep(3);
    } catch {
      setSqError("Error hua. Dobara try karein.");
    } finally {
      setSqLoading(false);
    }
  };

  const handleSqReset = async () => {
    setSqError("");
    if (sqNewPw.length < 8) {
      setSqError("Password kam se kam 8 characters ka hona chahiye.");
      return;
    }
    if (sqNewPw !== sqConfirmPw) {
      setSqError("Passwords match nahi kar rahe.");
      return;
    }
    setSqLoading(true);
    try {
      const hash = await hashPassword(sqNewPw);
      const ok = await extActor.resetPasswordWithOtp(
        sqUsername.trim(),
        sqOtp,
        hash,
      );
      if (ok) {
        toast.success("Password reset ho gaya! Ab sign in karein.");
        handleClose();
      } else {
        setSqError("Password reset fail hua. Dobara try karein.");
      }
    } catch {
      setSqError("Error hua. Dobara try karein.");
    } finally {
      setSqLoading(false);
    }
  };

  // ── Admin Reset Handler ──
  const handleAdminReset = async () => {
    setArError("");
    if (!arUsername.trim()) {
      setArError("Username daalna zaroori hai.");
      return;
    }
    setArLoading(true);
    try {
      await extActor.requestAdminPasswordReset(arUsername.trim());
      setArSuccess(true);
    } catch {
      setArError("Error hua. Dobara try karein.");
    } finally {
      setArLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent
        data-ocid="forgot.dialog"
        className="sm:max-w-md p-0 overflow-hidden border-0 shadow-2xl"
      >
        <div className="gradient-primary px-6 pt-6 pb-4 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-display font-bold text-white">
              Password Reset
            </DialogTitle>
          </DialogHeader>
          <p className="text-white/70 text-sm mt-1">
            Apna account recover karein
          </p>
        </div>

        <div className="p-4">
          <Tabs defaultValue="otp">
            <TabsList data-ocid="forgot.tab" className="w-full mb-4 bg-muted">
              <TabsTrigger
                data-ocid="forgot.otp.tab"
                value="otp"
                className="flex-1 text-xs data-[state=active]:gradient-primary data-[state=active]:text-white"
              >
                Mobile OTP
              </TabsTrigger>
              <TabsTrigger
                data-ocid="forgot.sq.tab"
                value="security"
                className="flex-1 text-xs data-[state=active]:gradient-primary data-[state=active]:text-white"
              >
                Security Q
              </TabsTrigger>
              <TabsTrigger
                data-ocid="forgot.admin.tab"
                value="admin"
                className="flex-1 text-xs data-[state=active]:gradient-primary data-[state=active]:text-white"
              >
                Admin Reset
              </TabsTrigger>
            </TabsList>

            {/* ── Mobile OTP Tab ── */}
            <TabsContent value="otp" className="space-y-3 mt-0">
              {otpStep === 1 && (
                <>
                  <div className="space-y-1.5">
                    <Label>Username</Label>
                    <Input
                      data-ocid="forgot.otp.username.input"
                      placeholder="apna username daalein"
                      value={otpUsername}
                      onChange={(e) => setOtpUsername(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleOtpVerifyUser()
                      }
                    />
                  </div>
                  {otpError && (
                    <p
                      data-ocid="forgot.otp.error_state"
                      className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2"
                    >
                      {otpError}
                    </p>
                  )}
                  <Button
                    data-ocid="forgot.otp.next.button"
                    onClick={handleOtpVerifyUser}
                    disabled={otpLoading}
                    className="w-full gradient-primary text-white border-0"
                  >
                    {otpLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "OTP Generate Karein"
                    )}
                  </Button>
                </>
              )}
              {otpStep === 2 && (
                <>
                  <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 text-center">
                    <p className="text-sm text-muted-foreground mb-1">
                      Aapka OTP hai:
                    </p>
                    <p className="text-3xl font-mono font-bold gradient-text tracking-widest">
                      {otpCode}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Yeh OTP neeche daalein
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>OTP Enter Karein</Label>
                    <Input
                      data-ocid="forgot.otp.code.input"
                      placeholder="6-digit OTP"
                      value={otpEntered}
                      onChange={(e) => setOtpEntered(e.target.value)}
                      maxLength={6}
                      className="font-mono text-center text-lg tracking-widest"
                    />
                  </div>
                  {otpError && (
                    <p
                      data-ocid="forgot.otp.verify.error_state"
                      className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2"
                    >
                      {otpError}
                    </p>
                  )}
                  <Button
                    data-ocid="forgot.otp.verify.button"
                    onClick={handleOtpVerifyCode}
                    className="w-full gradient-primary text-white border-0"
                  >
                    OTP Verify Karein
                  </Button>
                </>
              )}
              {otpStep === 3 && (
                <>
                  <div className="space-y-1.5">
                    <Label>Naya Password</Label>
                    <Input
                      data-ocid="forgot.otp.newpw.input"
                      type="password"
                      placeholder="Naya password (min 8 characters)"
                      value={otpNewPw}
                      onChange={(e) => setOtpNewPw(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Confirm Password</Label>
                    <Input
                      data-ocid="forgot.otp.confirmpw.input"
                      type="password"
                      placeholder="Password dobara daalein"
                      value={otpConfirmPw}
                      onChange={(e) => setOtpConfirmPw(e.target.value)}
                    />
                  </div>
                  {otpError && (
                    <p
                      data-ocid="forgot.otp.reset.error_state"
                      className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2"
                    >
                      {otpError}
                    </p>
                  )}
                  <Button
                    data-ocid="forgot.otp.reset.button"
                    onClick={handleOtpReset}
                    disabled={otpLoading}
                    className="w-full gradient-primary text-white border-0"
                  >
                    {otpLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Password Reset Karein"
                    )}
                  </Button>
                </>
              )}
            </TabsContent>

            {/* ── Security Question Tab ── */}
            <TabsContent value="security" className="space-y-3 mt-0">
              {sqStep === 1 && (
                <>
                  <div className="space-y-1.5">
                    <Label>Username</Label>
                    <Input
                      data-ocid="forgot.sq.username.input"
                      placeholder="apna username daalein"
                      value={sqUsername}
                      onChange={(e) => setSqUsername(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleSqGetQuestion()
                      }
                    />
                  </div>
                  {sqError && (
                    <p
                      data-ocid="forgot.sq.error_state"
                      className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2"
                    >
                      {sqError}
                    </p>
                  )}
                  <Button
                    data-ocid="forgot.sq.next.button"
                    onClick={handleSqGetQuestion}
                    disabled={sqLoading}
                    className="w-full gradient-primary text-white border-0"
                  >
                    {sqLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Question Dekhein"
                    )}
                  </Button>
                </>
              )}
              {sqStep === 2 && (
                <>
                  <div className="bg-primary/10 border border-primary/30 rounded-xl p-3">
                    <p className="text-sm font-medium">{sqQuestion}</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Aapka Jawab</Label>
                    <Input
                      data-ocid="forgot.sq.answer.input"
                      placeholder="Security question ka jawab"
                      value={sqAnswer}
                      onChange={(e) => setSqAnswer(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleSqVerifyAnswer()
                      }
                    />
                  </div>
                  {sqError && (
                    <p
                      data-ocid="forgot.sq.answer.error_state"
                      className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2"
                    >
                      {sqError}
                    </p>
                  )}
                  <Button
                    data-ocid="forgot.sq.verify.button"
                    onClick={handleSqVerifyAnswer}
                    disabled={sqLoading}
                    className="w-full gradient-primary text-white border-0"
                  >
                    {sqLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Verify Karein"
                    )}
                  </Button>
                </>
              )}
              {sqStep === 3 && (
                <>
                  <div className="space-y-1.5">
                    <Label>Naya Password</Label>
                    <Input
                      data-ocid="forgot.sq.newpw.input"
                      type="password"
                      placeholder="Naya password (min 8 characters)"
                      value={sqNewPw}
                      onChange={(e) => setSqNewPw(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Confirm Password</Label>
                    <Input
                      data-ocid="forgot.sq.confirmpw.input"
                      type="password"
                      placeholder="Password dobara daalein"
                      value={sqConfirmPw}
                      onChange={(e) => setSqConfirmPw(e.target.value)}
                    />
                  </div>
                  {sqError && (
                    <p
                      data-ocid="forgot.sq.reset.error_state"
                      className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2"
                    >
                      {sqError}
                    </p>
                  )}
                  <Button
                    data-ocid="forgot.sq.reset.button"
                    onClick={handleSqReset}
                    disabled={sqLoading}
                    className="w-full gradient-primary text-white border-0"
                  >
                    {sqLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Password Reset Karein"
                    )}
                  </Button>
                </>
              )}
            </TabsContent>

            {/* ── Admin Reset Tab ── */}
            <TabsContent value="admin" className="space-y-3 mt-0">
              {arSuccess ? (
                <div
                  data-ocid="forgot.admin.success_state"
                  className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center"
                >
                  <p className="text-emerald-700 dark:text-emerald-400 font-medium">
                    ✅ Reset request submit ho gayi!
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Admin jald hi aapko contact karenge.
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3"
                    onClick={handleClose}
                  >
                    Close
                  </Button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Admin aapke liye password reset karega. Request bhejne ke
                    baad admin aapse contact karega.
                  </p>
                  <div className="space-y-1.5">
                    <Label>Username</Label>
                    <Input
                      data-ocid="forgot.admin.username.input"
                      placeholder="apna username daalein"
                      value={arUsername}
                      onChange={(e) => setArUsername(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAdminReset()}
                    />
                  </div>
                  {arError && (
                    <p
                      data-ocid="forgot.admin.error_state"
                      className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2"
                    >
                      {arError}
                    </p>
                  )}
                  <Button
                    data-ocid="forgot.admin.submit_button"
                    onClick={handleAdminReset}
                    disabled={arLoading}
                    className="w-full gradient-primary text-white border-0"
                  >
                    {arLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Request Bhejein"
                    )}
                  </Button>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main AuthModal ────────────────────────────────────────────────────────────
export default function AuthModal({
  open,
  defaultTab = "signup",
  onSuccess,
}: AuthModalProps) {
  const { actor } = useActor();
  const extActor = actor as any;

  const [showForgot, setShowForgot] = useState(false);

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
      if (result === "ok") {
        toast.success("Account created! Welcome to Nibba Nibbi 🎉");
        onSuccess();
      } else if (result === "usernameTaken") {
        setSuError("That username is already taken. Try another!");
      } else if (result === "alreadyRegistered") {
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
      console.error("[Nibba Nibbi] registerWithCredentials error:", msg);
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
      console.error("[Nibba Nibbi] loginWithCredentials error:", msg);
      setSiError(`Login failed: ${msg}`);
    } finally {
      setSiLoading(false);
    }
  };

  return (
    <>
      <ForgotPasswordDialog
        open={showForgot}
        onClose={() => setShowForgot(false)}
      />
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
                Welcome to Nibba Nibbi
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
                  {usernameHasInvalidChars && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      ❌ Special characters (@, -, space, etc.) not allowed
                    </p>
                  )}
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground">
                      Letters, numbers, and underscores only (min 3 chars).
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs text-muted-foreground">
                        e.g.
                      </span>
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

                {/* Forgot Password link */}
                <div className="text-center">
                  <button
                    type="button"
                    data-ocid="auth.forgot.button"
                    onClick={() => setShowForgot(true)}
                    className="text-sm text-primary hover:underline cursor-pointer"
                  >
                    Password bhool gaye? Reset karein
                  </button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
