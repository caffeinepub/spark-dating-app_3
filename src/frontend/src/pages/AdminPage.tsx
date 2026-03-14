import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Activity, Shield, TrendingUp, Users } from "lucide-react";
import {
  useDiscoverProfiles,
  useIsAdmin,
  useUserCount,
} from "../hooks/useQueries";

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
    </div>
  );
}
