import { Toaster } from "@/components/ui/sonner";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  useNavigate,
} from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import AuthModal from "./components/AuthModal";
import Layout from "./components/Layout";
import { useActor } from "./hooks/useActor";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import AdminPage from "./pages/AdminPage";
import ChatPage from "./pages/ChatPage";
import DiscoverPage from "./pages/DiscoverPage";
import FeedPage from "./pages/FeedPage";
import LandingPage from "./pages/LandingPage";
import MatchesPage from "./pages/MatchesPage";
import MessagesPage from "./pages/MessagesPage";
import NotificationsPage from "./pages/NotificationsPage";
import OnboardingPage from "./pages/OnboardingPage";
import OwnProfilePage from "./pages/OwnProfilePage";
import SearchPage from "./pages/SearchPage";
import UserProfilePage from "./pages/UserProfilePage";

type AuthStage =
  | "loading"
  | "no-identity"
  | "needs-credentials"
  | "needs-onboarding"
  | "ready";

function withTimeout<T>(
  promise: Promise<T>,
  fallback: T,
  ms = 10000,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { identity, isInitializing } = useInternetIdentity();
  const { actor, isFetching } = useActor();
  const navigate = useNavigate();

  const [stage, setStage] = useState<AuthStage>("loading");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authRefreshKey, setAuthRefreshKey] = useState(0);
  const checkingRef = useRef(false);
  const actorRef = useRef(actor);
  actorRef.current = actor;

  useEffect(() => {
    void authRefreshKey; // trigger re-check after registration
    if (isInitializing) {
      setStage("loading");
      return;
    }
    if (!identity) {
      setStage("no-identity");
      return;
    }
    // Only show loading if there's no actor yet (first time)
    // Do NOT re-enter loading if actor exists (prevents infinite loop)
    if (!actor) {
      if (!isFetching) {
        // Actor not fetching and not available - something went wrong
        setStage("loading");
      }
      return;
    }

    if (checkingRef.current) return;
    checkingRef.current = true;

    const extActor = actorRef.current as any;
    void (async () => {
      try {
        const [username, onboarded] = await Promise.all([
          withTimeout(
            (extActor.getMyUsername?.() ?? Promise.resolve(null)).catch(
              () => null,
            ),
            null,
          ),
          withTimeout(
            (
              extActor.hasCompletedOnboarding?.() ?? Promise.resolve(false)
            ).catch(() => false),
            false,
          ),
        ]);
        if (!username) {
          setStage("needs-credentials");
          setShowAuthModal(true);
        } else if (!onboarded) {
          setStage("needs-onboarding");
        } else {
          setStage("ready");
        }
      } catch {
        setStage("needs-credentials");
        setShowAuthModal(true);
      } finally {
        checkingRef.current = false;
      }
    })();
  }, [identity, isInitializing, actor, isFetching, authRefreshKey]);

  useEffect(() => {
    if (stage === "needs-onboarding") {
      navigate({ to: "/onboarding" });
    }
  }, [stage, navigate]);

  const handleRegistrationSuccess = useCallback(() => {
    setShowAuthModal(false);
    checkingRef.current = false;
    setAuthRefreshKey((k) => k + 1);
    setStage("loading");
  }, []);

  if (stage === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  if (stage === "no-identity") {
    return <LandingPage onLoginSuccess={() => setStage("loading")} />;
  }

  if (stage === "needs-credentials" || showAuthModal) {
    return (
      <>
        <div className="min-h-screen gradient-soft" />
        <AuthModal
          open={showAuthModal}
          defaultTab="signup"
          onSuccess={handleRegistrationSuccess}
        />
      </>
    );
  }

  if (stage === "needs-onboarding") {
    return <OnboardingPage />;
  }

  return <>{children}</>;
}

function AppRoot() {
  const { identity } = useInternetIdentity();
  const navigate = useNavigate();

  useEffect(() => {
    if (identity) {
      navigate({ to: "/feed" });
    }
  }, [identity, navigate]);

  if (!identity) {
    return (
      <>
        <Toaster position="top-center" />
        <LandingPage />
      </>
    );
  }

  return (
    <>
      <Toaster position="top-center" />
      <Outlet />
    </>
  );
}

const rootRoute = createRootRoute({ component: AppRoot });

const layoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "layout",
  component: () => (
    <AuthGate>
      <Layout />
    </AuthGate>
  ),
});

const landingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: LandingPage,
});

const onboardingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/onboarding",
  component: OnboardingPage,
});

const feedRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/feed",
  component: FeedPage,
});

const searchRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/search",
  component: SearchPage,
});

const discoverRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/discover",
  component: DiscoverPage,
});

const matchesRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/matches",
  component: MatchesPage,
});

const messagesRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/messages",
  component: MessagesPage,
});

const chatRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/messages/$userId",
  component: ChatPage,
});

const ownProfileRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/profile",
  component: OwnProfilePage,
});

const userProfileRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/profile/$userId",
  component: UserProfilePage,
});

const notificationsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/notifications",
  component: NotificationsPage,
});

const adminRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/admin",
  component: AdminPage,
});

const routeTree = rootRoute.addChildren([
  landingRoute,
  onboardingRoute,
  layoutRoute.addChildren([
    feedRoute,
    searchRoute,
    discoverRoute,
    matchesRoute,
    messagesRoute,
    chatRoute,
    ownProfileRoute,
    userProfileRoute,
    notificationsRoute,
    adminRoute,
  ]),
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return <RouterProvider router={router} />;
}
