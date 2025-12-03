import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import DashboardPage from "@/pages/dashboard";
import PageBuilderPage from "@/pages/page-builder";
import PublicNudgPage from "@/pages/public-nudge";
import FeedbackPage from "@/pages/feedback";
import PricingPage from "@/pages/pricing";
import ProfilePage from "@/pages/profile";
import LandingPage from "@/pages/landing";
import AuthPage from "@/pages/auth";
import { LayoutDashboard, Sparkles, Pencil, MessageSquare, CreditCard, UserCircle, LogOut, LogIn, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

function Navigation() {
  const [location] = useLocation();
  const { logout, isLoggingOut, user, isAuthenticated } = useAuth();
  
  const navItems = [
    { path: "/", label: "Home", icon: Sparkles, showAlways: true },
    { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard, showAlways: true },
    { path: "/builder", label: "Page Builder", icon: Pencil, showAlways: true },
    { path: "/pricing", label: "Pricing", icon: CreditCard, showAlways: true },
    { path: "/feedback", label: "Feedback", icon: MessageSquare, showAlways: true },
  ];

  const handleLogout = async () => {
    await logout();
  };

  return (
    <nav className="glass-card sticky top-0 z-50 border-b">
      <div className="px-8 py-4 flex items-center gap-6">
        <Link href="/">
          <div className="flex items-center gap-3 cursor-pointer">
            <div className="gradient-primary p-2 rounded-xl">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gradient">
              Nudg
            </h1>
          </div>
        </Link>
        <div className="flex gap-2">
          {navItems.filter(item => item.path !== "/").map(item => {
            const Icon = item.icon;
            const isActive = location === item.path;
            return (
              <Link key={item.path} href={item.path}>
                <button 
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all font-medium ${
                    isActive 
                      ? "gradient-primary text-white shadow-lg shadow-purple-500/30" 
                      : "hover:bg-muted hover:shadow-md"
                  }`}
                  data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              </Link>
            );
          })}
        </div>
        <div className="ml-auto flex items-center gap-4">
          {isAuthenticated ? (
            <>
              {user && (
                <Link href="/profile">
                  <span className="text-sm font-medium text-muted-foreground hover:text-foreground cursor-pointer hidden md:block">
                    {user.username}
                  </span>
                </Link>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
                onClick={handleLogout}
                disabled={isLoggingOut}
                data-testid="button-logout"
              >
                {isLoggingOut ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <LogOut className="h-4 w-4 mr-2" />
                    Log out
                  </>
                )}
              </Button>
            </>
          ) : (
            <Link href="/auth">
              <Button
                variant="default"
                size="sm"
                className="gradient-primary text-white"
                data-testid="button-login"
              >
                <LogIn className="h-4 w-4 mr-2" />
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

function Router() {
  const { isAuthenticated } = useAuth();
  const [location] = useLocation();
  
  if (location.startsWith('/n/')) {
    return <Route path="/n/:slug" component={PublicNudgPage} />;
  }
  
  return (
    <>
      <Navigation />
      <Switch>
        <Route path="/" component={LandingPage} />
        <Route path="/dashboard" component={DashboardPage} />
        <Route path="/builder" component={PageBuilderPage} />
        <Route path="/pricing" component={PricingPage} />
        <Route path="/feedback" component={FeedbackPage} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/profile">
          {isAuthenticated ? <ProfilePage /> : <AuthPage />}
        </Route>
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
