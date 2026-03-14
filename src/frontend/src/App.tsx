import { Toaster } from "@/components/ui/sonner";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import AuthModal from "./components/AuthModal";
import Layout from "./components/Layout";
import { useActor } from "./hooks/useActor";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import AdminPage from "./pages/AdminPage";
import ChatPage from "./pages/ChatPage";
import DiscoverPage from "./pages/DiscoverPage";
import LandingPage from "./pages/LandingPage";
import MatchesPage from "./pages/MatchesPage";
import MessagesPage from "./pages/MessagesPage";
import NotificationsPage from "./pages/NotificationsPage";
import OnboardingPage from "./pages/OnboardingPage";
import OwnProfilePage from "./pages/OwnProfilePage";
import UserProfilePage from "./pages/UserProfilePage";

type AuthStage =
  | "loading"
  | "no-identity"
  | "needs-credentials"
  | "needs-onboarding"
  | "ready";

/** Wraps a promise with a timeout that resolves to the fallback value if too slow */
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

  useEffect(() => {
    if (isInitializing) {
      setStage("loading");
      return;
    }
    if (!identity) {
      setStage("no-identity");
      return;
    }
    if (isFetching || !actor) {
      setStage("loading");
      return;
    }
    const extActor = actor as any;
    (async () => {
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
      }
    })();
  }, [identity, isInitializing, actor, isFetching]);

  useEffect(() => {
    if (stage === "needs-onboarding") {
      navigate({ to: "/onboarding" });
    }
  }, [stage, navigate]);

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
          onSuccess={() => {
            setShowAuthModal(false);
            setStage("loading");
          }}
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
      navigate({ to: "/discover" });
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
