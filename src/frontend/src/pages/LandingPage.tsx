import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import {
  ChevronDown,
  Flame,
  Heart,
  MapPin,
  MessageCircle,
  Shield,
  Users,
  Zap,
} from "lucide-react";
import { useEffect } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

const LOGO = "/assets/generated/nibba-nibbi-logo-transparent.png";

const features = [
  {
    icon: Heart,
    title: "Smart Matching",
    desc: "Our algorithm surfaces people who share your real passions and values — not just proximity.",
    num: "01",
  },
  {
    icon: MessageCircle,
    title: "Real Connections",
    desc: "Beautiful, fast chat that feels like texting someone you already love talking to.",
    num: "02",
  },
  {
    icon: Shield,
    title: "Safe & Private",
    desc: "Built on the Internet Computer. Your data is yours — no data brokers, ever.",
    num: "03",
  },
  {
    icon: Zap,
    title: "Instant Connections",
    desc: "Like, follow, and connect in seconds. When it's mutual, you'll both know immediately.",
    num: "04",
  },
  {
    icon: Users,
    title: "Vibrant Community",
    desc: "Thousands of genuine people looking for the same thing you are — real connection.",
    num: "05",
  },
  {
    icon: MapPin,
    title: "Discover Nearby",
    desc: "Filter by interests, gender, and more to find people who feel like home.",
    num: "06",
  },
];

const sampleProfiles = [
  {
    name: "Sofia",
    age: 26,
    tag: "Travel & Art",
    photo: "/assets/generated/profile-sofia.dim_300x400.jpg",
    floatClass: "float-a",
    interests: ["Travel", "Art"],
    matched: false,
  },
  {
    name: "Lena",
    age: 24,
    tag: "Music & Coffee",
    photo: "/assets/generated/profile-lena.dim_300x400.jpg",
    floatClass: "float-b",
    interests: ["Music", "Coffee"],
    matched: true,
  },
  {
    name: "Marco",
    age: 28,
    tag: "Hiking & Food",
    photo: "/assets/generated/profile-marco.dim_300x400.jpg",
    floatClass: "float-c",
    interests: ["Hiking", "Food"],
    matched: false,
  },
  {
    name: "Alex",
    age: 25,
    tag: "Tech & Books",
    photo: "/assets/generated/profile-alex.dim_300x400.jpg",
    floatClass: "float-d",
    interests: ["Tech", "Books"],
    matched: false,
  },
];

interface LandingPageProps {
  onLoginSuccess?: () => void;
  onTabChange?: (tab: "signin" | "signup") => void;
}

export default function LandingPage({
  onLoginSuccess,
  onTabChange,
}: LandingPageProps = {}) {
  const { login, loginStatus, identity } = useInternetIdentity();
  const navigate = useNavigate();
  const isLoggingIn = loginStatus === "logging-in";

  useEffect(() => {
    if (identity) {
      navigate({ to: "/discover" });
    }
  }, [identity, navigate]);

  const handleLogin = async (tab: "signin" | "signup" = "signup") => {
    onTabChange?.(tab);
    await login();
    onLoginSuccess?.();
  };

  if (identity) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-white/20 shadow-sm">
        <div className="container mx-auto flex items-center justify-between h-16 px-6">
          <div className="flex items-center gap-2">
            <img
              src={LOGO}
              className="h-10 w-auto object-contain"
              alt="Nibba Nibbi"
            />
            <span className="font-display font-bold text-xl gradient-text">
              Nibba Nibbi
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => handleLogin("signin")}
              disabled={isLoggingIn}
              data-ocid="landing.sign_in_button"
              className="text-gray-700 hover:text-purple-700"
            >
              Sign In
            </Button>
            <Button
              onClick={() => handleLogin("signup")}
              disabled={isLoggingIn}
              data-ocid="landing.get_started_button"
              className="gradient-primary text-white border-0 rounded-full px-6 shadow-glow hover:shadow-glow-lg transition-all"
            >
              {isLoggingIn ? "Connecting..." : "Get Started"}
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden hero-bg">
        {/* Floating profile cards left */}
        <div className="absolute left-6 xl:left-16 top-1/2 -translate-y-1/2 hidden lg:flex flex-col gap-5 z-10">
          {sampleProfiles.slice(0, 2).map((p) => (
            <HeroProfileCard key={p.name} profile={p} />
          ))}
        </div>
        {/* Floating profile cards right */}
        <div className="absolute right-6 xl:right-16 top-1/2 -translate-y-1/2 hidden lg:flex flex-col gap-5 z-10">
          {sampleProfiles.slice(2).map((p) => (
            <HeroProfileCard key={p.name} profile={p} />
          ))}
        </div>

        <div className="relative z-10 text-center px-6 max-w-lg mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-dark text-white/90 text-sm font-medium mb-8 border border-white/15">
            <span className="w-2 h-2 rounded-full bg-pink-400 inline-block" />
            The modern dating experience
          </div>

          {/* Center logo */}
          <div className="flex justify-center mb-6">
            <img
              src={LOGO}
              className="h-24 md:h-32 w-auto object-contain drop-shadow-2xl"
              alt="Nibba Nibbi"
            />
          </div>

          {/* Heading */}
          <h1 className="font-display text-6xl md:text-8xl font-bold text-white mb-3 leading-[0.9] tracking-tight">
            Nibba Nibbi
          </h1>

          {/* Subtitle */}
          <p className="text-2xl md:text-3xl font-display italic text-white/80 mb-6 leading-snug">
            Find your perfect match.
          </p>

          {/* Body */}
          <p className="text-white/60 text-base md:text-lg mb-10 max-w-sm mx-auto leading-relaxed">
            Connect with extraordinary people and find your true love.
          </p>

          {/* CTAs */}
          <div className="flex flex-col gap-3 max-w-xs mx-auto w-full">
            <Button
              size="lg"
              onClick={() => handleLogin("signup")}
              disabled={isLoggingIn}
              data-ocid="landing.hero.get_started_button"
              className="gradient-primary text-white border-0 shadow-glow-lg text-base py-6 rounded-full w-full hover:scale-105 transition-all font-semibold"
            >
              {isLoggingIn ? "Connecting..." : "✨ Start for free"}
            </Button>
            <Button
              size="lg"
              onClick={() => handleLogin("signin")}
              disabled={isLoggingIn}
              data-ocid="landing.hero.sign_in_button"
              className="glass-dark border border-white/20 text-white hover:bg-white/10 text-base py-6 rounded-full w-full transition-all"
            >
              Sign in
            </Button>
          </div>

          {/* Trust tagline */}
          <p className="text-white/40 text-xs mt-8 tracking-wide">
            Trusted by 12,000+ people finding real connections
          </p>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/40 bounce-y">
          <ChevronDown className="w-5 h-5" />
        </div>
      </section>

      {/* ── Features section ── */}
      <section className="py-28 px-6 bg-background">
        <div className="container mx-auto max-w-5xl">
          <div className="mb-20">
            <p className="text-primary text-sm font-semibold tracking-widest uppercase mb-3">
              Why Nibba Nibbi
            </p>
            <h2 className="font-display text-4xl md:text-6xl max-w-lg leading-tight text-foreground">
              Everything you need to find{" "}
              <span className="gradient-text italic">real love.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border rounded-2xl overflow-hidden shadow-card">
            {features.map(({ icon: Icon, title, desc, num }) => (
              <div
                key={title}
                className="group bg-card p-8 hover:bg-accent/30 transition-colors duration-200 relative"
              >
                <div className="absolute top-0 left-8 right-8 h-px gradient-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <span className="font-display text-6xl font-bold gradient-text opacity-15 group-hover:opacity-25 transition-opacity select-none leading-none block mb-4">
                  {num}
                </span>
                <div className="flex items-center gap-2.5 mb-3">
                  <Icon className="w-5 h-5 text-primary shrink-0" />
                  <h3 className="font-semibold text-base text-foreground">
                    {title}
                  </h3>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-20 px-6 gradient-soft">
        <div className="container mx-auto max-w-3xl text-center">
          <p className="text-primary text-sm font-semibold tracking-widest uppercase mb-3">
            Simple & Secure
          </p>
          <h2 className="font-display text-3xl md:text-5xl font-bold mb-12 text-foreground">
            Get started in minutes
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Connect Securely",
                desc: "Click 'Get Started' and authenticate with Internet Identity — no email required.",
              },
              {
                step: "2",
                title: "Create Your Username",
                desc: "Choose a unique username and password to personalize your Nibba Nibbi identity.",
              },
              {
                step: "3",
                title: "Find Your Match",
                desc: "Set up your profile and start discovering people who match your vibe.",
              },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-white font-bold text-lg shadow-glow">
                  {step}
                </div>
                <h3 className="font-semibold text-base text-foreground">
                  {title}
                </h3>
                <p className="text-muted-foreground text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA section ── */}
      <section className="py-28 px-6 gradient-primary text-white relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
          }}
        />
        <div className="container mx-auto max-w-2xl text-center relative z-10">
          <h2 className="font-display text-4xl md:text-6xl font-bold mb-5 leading-tight">
            Ready to find your match?
          </h2>
          <p className="text-white/75 text-lg mb-10 max-w-md mx-auto">
            Join the community. No subscriptions, no tricks — just real
            connections.
          </p>
          <Button
            size="lg"
            onClick={() => handleLogin("signup")}
            disabled={isLoggingIn}
            data-ocid="landing.cta.get_started_button"
            className="bg-white text-primary hover:bg-white/92 text-lg px-14 py-7 rounded-full font-semibold shadow-2xl hover:scale-105 transition-all"
          >
            {isLoggingIn ? "Connecting..." : "Start Your Journey →"}
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-sm text-muted-foreground border-t border-border">
        © {new Date().getFullYear()}{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          Built with ❤️ using caffeine.ai
        </a>
      </footer>
    </div>
  );
}

// ── Hero floating profile card ──
interface HeroProfile {
  name: string;
  age: number;
  tag: string;
  photo: string;
  floatClass: string;
  interests: string[];
  matched: boolean;
}

function HeroProfileCard({ profile }: { profile: HeroProfile }) {
  return (
    <div
      className={`w-44 rounded-2xl overflow-hidden shadow-2xl border border-white/20 ${profile.floatClass} ${
        profile.matched ? "match-ring" : ""
      }`}
    >
      <div className="relative h-52 overflow-hidden bg-gradient-to-br from-pink-400 to-purple-600">
        <img
          src={profile.photo}
          alt={profile.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 shadow-[inset_0_-40px_40px_-10px_rgba(0,0,0,0.55)]" />
        {profile.matched && (
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-1 rounded-full gradient-primary text-white text-[10px] font-bold shadow-glow">
            <Heart className="w-2.5 h-2.5 fill-white" />
            Match!
          </div>
        )}
        <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full glass-dark text-white text-[10px] font-medium">
          <Heart className="w-2.5 h-2.5 fill-white" />
          {profile.matched ? "12" : "7"}
        </div>
      </div>
      <div className="p-2.5 bg-card">
        <div className="flex items-baseline justify-between mb-1.5">
          <p className="font-semibold text-sm text-foreground leading-none">
            {profile.name}
          </p>
          <span className="text-xs text-muted-foreground">{profile.age}</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {profile.interests.map((interest) => (
            <span
              key={interest}
              className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium"
            >
              {interest}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
