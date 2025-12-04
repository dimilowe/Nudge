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
      <div className="px-4 md:px-8 py-3 md:py-4 flex items-center justify-between">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="gradient-primary p-1.5 md:p-2 rounded-xl">
              <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-white" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-gradient">
              Nudg
            </h1>
          </div>
        </Link>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex gap-2">
          {navItems.filter(item => item.path !== "/").map(item => {
            const Icon = item.icon;
            const isActive = location === item.path;
            return (
              <Link key={item.path} href={item.path}>
                <button 
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-medium text-sm ${
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
        
        {/* Mobile Navigation - Show key items only */}
        <div className="flex md:hidden gap-1">
          {navItems.filter(item => ["/pricing", "/feedback"].includes(item.path)).map(item => {
            const Icon = item.icon;
            const isActive = location === item.path;
            return (
              <Link key={item.path} href={item.path}>
                <button 
                  className={`flex items-center gap-1 px-2.5 py-2 rounded-lg transition-all font-medium text-xs ${
                    isActive 
                      ? "gradient-primary text-white" 
                      : "hover:bg-muted"
                  }`}
                  data-testid={`nav-mobile-${item.label.toLowerCase().replace(' ', '-')}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </button>
              </Link>
            );
          })}
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          {isAuthenticated ? (
            <>
              {user && (
                <Link href="/profile">
                  <span className="text-xs md:text-sm font-medium text-muted-foreground hover:text-foreground cursor-pointer hidden sm:block">
                    {user.username}
                  </span>
                </Link>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground text-xs md:text-sm px-2 md:px-3"
                onClick={handleLogout}
                disabled={isLoggingOut}
                data-testid="button-logout"
              >
                {isLoggingOut ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <LogOut className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline">Log out</span>
                  </>
                )}
              </Button>
            </>
          ) : (
            <Link href="/auth">
              <Button
                variant="default"
                size="sm"
                className="gradient-primary text-white text-xs md:text-sm px-3 md:px-4"
                data-testid="button-login"
              >
                <LogIn className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Sign In</span>
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
