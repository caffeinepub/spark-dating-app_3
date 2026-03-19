import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import {
  Link,
  Outlet,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import {
  Bell,
  Camera,
  Compass,
  Heart,
  Home,
  LogOut,
  MessageCircle,
  Search,
  Shield,
  User,
} from "lucide-react";
import { useEffect } from "react";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useUnreadCount } from "../hooks/useQueries";

const LOGO = "/assets/generated/nibba-nibbi-logo-transparent.png";

const navItems = [
  { to: "/feed", icon: Home, label: "Feed", ocid: "nav.feed_link" },
  { to: "/search", icon: Search, label: "Search", ocid: "nav.search_link" },
  {
    to: "/discover",
    icon: Compass,
    label: "Discover",
    ocid: "nav.discover_link",
  },
  { to: "/matches", icon: Heart, label: "Matches", ocid: "nav.matches_link" },
  {
    to: "/messages",
    icon: MessageCircle,
    label: "Messages",
    ocid: "nav.messages_link",
  },
  {
    to: "/notifications",
    icon: Bell,
    label: "Alerts",
    ocid: "nav.notifications_link",
  },
  { to: "/profile", icon: User, label: "Profile", ocid: "nav.profile_link" },
];

function NavItem({
  to,
  icon: Icon,
  label,
  ocid,
  unread,
}: {
  to: string;
  icon: React.ElementType;
  label: string;
  ocid: string;
  unread?: number;
}) {
  const routerState = useRouterState();
  const isActive =
    routerState.location.pathname === to ||
    routerState.location.pathname.startsWith(`${to}/`);
  return (
    <Link
      to={to}
      data-ocid={ocid}
      className={cn(
        "relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
        isActive
          ? "gradient-primary text-white shadow-glow"
          : "text-muted-foreground hover:text-foreground hover:bg-accent",
      )}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
      {unread !== undefined && unread > 0 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full gradient-primary text-white text-xs flex items-center justify-center">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}

function MobileNavItem({
  to,
  icon: Icon,
  label,
  ocid,
  unread,
  special,
}: {
  to: string;
  icon: React.ElementType;
  label: string;
  ocid: string;
  unread?: number;
  special?: boolean;
}) {
  const routerState = useRouterState();
  const isActive =
    routerState.location.pathname === to ||
    routerState.location.pathname.startsWith(`${to}/`);
  return (
    <Link
      to={to}
      data-ocid={ocid}
      className={cn(
        "relative flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-all",
        special ? "" : isActive ? "text-primary" : "text-muted-foreground",
      )}
    >
      {special ? (
        <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center shadow-glow -mt-4 mb-0.5 border-2 border-background">
          <Icon className="w-5 h-5 text-white" />
        </div>
      ) : (
        <div className="relative">
          <Icon className="w-5 h-5" />
          {unread !== undefined && unread > 0 && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full gradient-primary text-white text-[9px] flex items-center justify-center">
              {unread > 9 ? "9" : unread}
            </span>
          )}
        </div>
      )}
      <span className={special ? "text-primary font-semibold" : ""}>
        {label}
      </span>
    </Link>
  );
}

export default function Layout() {
  const { clear } = useInternetIdentity();
  const { actor } = useActor();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: unreadCount } = useUnreadCount();

  useEffect(() => {
    if (!actor) return;
    actor.setOnline().catch(() => null);
    return () => {
      actor.setOffline().catch(() => null);
    };
  }, [actor]);

  const handleLogout = async () => {
    if (actor) await (actor as any).setOffline().catch(() => null);
    clear();
    qc.clear();
    navigate({ to: "/" });
  };

  const unread = unreadCount ? Number(unreadCount) : 0;

  // Mobile nav: split around camera button in center
  const mobileNavLeft = navItems.slice(0, 3);
  const mobileNavRight = navItems.slice(3, 6);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Desktop top nav */}
      <header className="hidden md:flex sticky top-0 z-50 glass border-b border-border h-16 items-center px-6 justify-between">
        <Link to="/feed" className="flex items-center gap-2">
          <img
            src={LOGO}
            className="h-8 w-auto object-contain"
            alt="Nibba Nibbi"
          />
          <span className="font-display font-bold text-xl gradient-text">
            Nibba Nibbi
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          {navItems.map(({ to, icon, label, ocid }) => (
            <NavItem
              key={to}
              to={to}
              icon={icon}
              label={label}
              ocid={ocid}
              unread={to === "/notifications" ? unread : undefined}
            />
          ))}
          {/* Camera link in desktop nav */}
          <NavItem
            to="/camera"
            icon={Camera}
            label="Camera"
            ocid="nav.camera_link"
          />
          <NavItem
            to="/admin"
            icon={Shield}
            label="Admin"
            ocid="nav.admin_link"
          />
        </nav>
        <button
          type="button"
          data-ocid="nav.logout.button"
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-accent"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </header>

      {/* Main content */}
      <main className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden glass border-t border-border z-50 flex items-end">
        {/* Left items */}
        {mobileNavLeft.map(({ to, icon, label, ocid }) => (
          <MobileNavItem
            key={to}
            to={to}
            icon={icon}
            label={label}
            ocid={ocid}
            unread={to === "/notifications" ? unread : undefined}
          />
        ))}

        {/* Center Camera button */}
        <MobileNavItem
          to="/camera"
          icon={Camera}
          label="Camera"
          ocid="nav.mobile.camera_link"
          special
        />

        {/* Right items */}
        {mobileNavRight.map(({ to, icon, label, ocid }) => (
          <MobileNavItem
            key={to}
            to={to}
            icon={icon}
            label={label}
            ocid={ocid}
            unread={to === "/notifications" ? unread : undefined}
          />
        ))}

        {/* Logout */}
        <button
          type="button"
          data-ocid="nav.mobile.logout.button"
          onClick={handleLogout}
          className="flex-1 flex flex-col items-center gap-0.5 py-3 text-xs font-medium text-rose-500 transition-all hover:text-rose-600"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </nav>

      {/* Footer (desktop only) */}
      <footer className="hidden md:block text-center text-xs text-muted-foreground py-4 border-t border-border">
        © {new Date().getFullYear()}. Built with ❤️ using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          caffeine.ai
        </a>
      </footer>
    </div>
  );
}
