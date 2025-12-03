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
import { LayoutDashboard, Sparkles, Pencil, MessageSquare, CreditCard, UserCircle, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

function Navigation() {
  const [location] = useLocation();
  
  const navItems = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard },
    { path: "/builder", label: "Page Builder", icon: Pencil },
    { path: "/pricing", label: "Pricing", icon: CreditCard },
    { path: "/feedback", label: "Feedback", icon: MessageSquare },
    { path: "/profile", label: "Profile", icon: UserCircle },
  ];

  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  return (
    <nav className="glass-card sticky top-0 z-50 border-b">
      <div className="px-8 py-4 flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="gradient-primary p-2 rounded-xl">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gradient">
            Nudg
          </h1>
        </div>
        <div className="flex gap-2">
          {navItems.map(item => {
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
          <span className="text-sm font-medium bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent hidden md:block">
            The Conversion Brain for Creators
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={handleLogout}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Log out
          </Button>
        </div>
      </div>
    </nav>
  );
}

function AuthenticatedRouter() {
  return (
    <>
      <Navigation />
      <Switch>
        <Route path="/" component={DashboardPage} />
        <Route path="/builder" component={PageBuilderPage} />
        <Route path="/pricing" component={PricingPage} />
        <Route path="/feedback" component={FeedbackPage} />
        <Route path="/profile" component={ProfilePage} />
        <Route path="/n/:slug" component={PublicNudgPage} />
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }
  
  if (location.startsWith('/n/')) {
    return <Route path="/n/:slug" component={PublicNudgPage} />;
  }
  
  if (!isAuthenticated) {
    return <LandingPage />;
  }
  
  return <AuthenticatedRouter />;
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
