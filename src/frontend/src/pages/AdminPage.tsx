import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useNavigate } from "@tanstack/react-router";
import {
  Activity,
  KeyRound,
  Loader2,
  Shield,
  TrendingUp,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useActor } from "../hooks/useActor";
import {
  useDiscoverProfiles,
  useIsAdmin,
  useUserCount,
} from "../hooks/useQueries";
import { hashPassword } from "../utils/crypto";

interface ResetRequest {
  username: string;
  requestTime: bigint;
}

function PasswordResetRequestsSection() {
  const { actor } = useActor();
  const extActor = actor as any;
  const [requests, setRequests] = useState<ResetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetTarget, setResetTarget] = useState<string | null>(null);
  const [newPw, setNewPw] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const fetchRequests = async () => {
    if (!extActor) return;
    setLoading(true);
    try {
      const data = await extActor.getPendingPasswordResetRequests();
      setRequests(data ?? []);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: fetch on actor availability
  useEffect(() => {
    if (extActor) fetchRequests();
  }, [extActor]);

  const handleAdminReset = async () => {
    if (!resetTarget || !newPw.trim()) return;
    if (newPw.length < 8) {
      toast.error("Password kam se kam 8 characters ka hona chahiye.");
      return;
    }
    setResetLoading(true);
    try {
      const hash = await hashPassword(newPw);
      const ok = await extActor.adminResetPassword(resetTarget, hash);
      if (ok) {
        toast.success(`Password reset for ${resetTarget}`);
        setResetTarget(null);
        setNewPw("");
        fetchRequests();
      } else {
        toast.error("Reset fail hua. Dobara try karein.");
      }
    } catch {
      toast.error("Error hua. Dobara try karein.");
    } finally {
      setResetLoading(false);
    }
  };

  const formatTime = (ts: bigint) => {
    const ms = Number(ts) / 1_000_000;
    return new Date(ms).toLocaleString();
  };

  return (
    <>
      {/* Admin Reset Password Dialog */}
      <Dialog
        open={!!resetTarget}
        onOpenChange={(v) => !v && setResetTarget(null)}
      >
        <DialogContent data-ocid="admin.reset.dialog" className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Password Reset for @{resetTarget}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label>Naya Password</Label>
              <Input
                data-ocid="admin.reset.input"
                type="password"
                placeholder="Naya password (min 8 characters)"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdminReset()}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                data-ocid="admin.reset.cancel_button"
                variant="outline"
                onClick={() => {
                  setResetTarget(null);
                  setNewPw("");
                }}
              >
                Cancel
              </Button>
              <Button
                data-ocid="admin.reset.confirm_button"
                onClick={handleAdminReset}
                disabled={resetLoading || newPw.length < 8}
                className="gradient-primary text-white border-0"
              >
                {resetLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Reset Karein"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden mt-8">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">Password Reset Requests</h2>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Pending admin password reset requests
            </p>
          </div>
          <Button
            data-ocid="admin.reset.refresh.button"
            variant="outline"
            size="sm"
            onClick={fetchRequests}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Refresh"}
          </Button>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {["1", "2"].map((k) => (
              <Skeleton key={k} className="h-12 w-full" />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div
            data-ocid="admin.reset.empty_state"
            className="p-10 text-center text-muted-foreground"
          >
            <KeyRound className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Koi pending reset request nahi hai.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Requested At</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req, i) => (
                  <TableRow
                    key={req.username}
                    data-ocid={`admin.reset.row.${i + 1}`}
                  >
                    <TableCell className="font-medium">
                      @{req.username}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatTime(req.requestTime)}
                    </TableCell>
                    <TableCell>
                      <Button
                        data-ocid={`admin.reset.button.${i + 1}`}
                        size="sm"
                        className="gradient-primary text-white border-0 text-xs"
                        onClick={() => {
                          setResetTarget(req.username);
                          setNewPw("");
                        }}
                      >
                        Reset Password
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </>
  );
}

export default function AdminPage() {
  const navigate = useNavigate();
  const { data: isAdmin, isLoading: checkingAdmin } = useIsAdmin();
  const { data: userCount } = useUserCount();
  const { data, isLoading: loadingProfiles } = useDiscoverProfiles();

  const profiles = data?.profiles ?? [];

  if (checkingAdmin) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <Skeleton className="h-10 w-48 mb-6" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-24 text-center">
        <div className="w-20 h-20 mx-auto gradient-soft rounded-full flex items-center justify-center mb-4">
          <Shield className="w-10 h-10 text-primary" />
        </div>
        <h3 className="font-display text-2xl font-semibold mb-2">
          Admin Access Required
        </h3>
        <p className="text-muted-foreground mb-6">
          You need admin privileges to view this page.
        </p>
        <Button onClick={() => navigate({ to: "/discover" })} variant="outline">
          Back to Discover
        </Button>
      </div>
    );
  }

  const activeProfiles = profiles.filter((p) => p.isActive);

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-6 h-6 text-primary" />
          <h1 className="font-display text-3xl font-bold">Admin Panel</h1>
        </div>
        <p className="text-muted-foreground">
          Manage users and monitor platform activity
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-primary" />
            <span className="text-sm text-muted-foreground">Total Users</span>
          </div>
          <p className="font-display text-3xl font-bold gradient-text">
            {userCount !== undefined ? userCount.toString() : "—"}
          </p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5 text-green-500" />
            <span className="text-sm text-muted-foreground">Active Users</span>
          </div>
          <p className="font-display text-3xl font-bold text-green-600">
            {activeProfiles.length}
          </p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-secondary" />
            <span className="text-sm text-muted-foreground">
              Profiles Loaded
            </span>
          </div>
          <p
            className="font-display text-3xl font-bold"
            style={{ color: "oklch(0.55 0.22 295)" }}
          >
            {profiles.length}
          </p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="text-sm text-muted-foreground">Your Role</span>
          </div>
          <Badge className="gradient-primary text-white border-0">Admin</Badge>
        </div>
      </div>

      {/* User table */}
      <div className="bg-card border border-border rounded-2xl shadow-card overflow-hidden">
        <div className="p-5 border-b border-border">
          <h2 className="font-semibold">User Management</h2>
          <p className="text-sm text-muted-foreground">
            Known profiles from discovery feed
          </p>
        </div>
        {loadingProfiles ? (
          <div className="p-5 space-y-3">
            {["1", "2", "3", "4"].map((k) => (
              <Skeleton key={k} className="h-12 w-full" />
            ))}
          </div>
        ) : profiles.length === 0 ? (
          <div
            data-ocid="admin.empty_state"
            className="p-10 text-center text-muted-foreground"
          >
            No users loaded yet.
          </div>
        ) : (
          <div data-ocid="admin.user_table" className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Interests</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((profile, i) => (
                  <TableRow
                    key={profile.principal?.toString() ?? i}
                    data-ocid={`admin.row.${i + 1}`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full gradient-soft flex items-center justify-center overflow-hidden shrink-0">
                          {profile.photoLink ? (
                            <img
                              src={profile.photoLink}
                              alt={profile.displayName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-display text-primary">
                              {profile.displayName?.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <span className="font-medium">
                          {profile.displayName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">
                      {profile.gender}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {profile.interests.slice(0, 2).map((interest) => (
                          <Badge
                            key={interest.id.toString()}
                            variant="secondary"
                            className="text-xs"
                          >
                            {interest.name}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={profile.isActive ? "default" : "secondary"}
                        className={
                          profile.isActive
                            ? "gradient-primary text-white border-0"
                            : ""
                        }
                      >
                        {profile.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        data-ocid={`admin.deactivate_button.${i + 1}`}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() =>
                          navigate({
                            to: `/profile/${profile.principal?.toString()}`,
                          })
                        }
                      >
                        View Profile
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Password Reset Requests */}
      <PasswordResetRequestsSection />
    </div>
  );
}
