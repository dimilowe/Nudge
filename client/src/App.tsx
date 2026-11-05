import { Switch, Route, Link, useLocation, Redirect, Router as WouterRouter } from "wouter";
import { ClerkAppProvider, basePath } from "@/components/ClerkAppProvider";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import DashboardPage from "@/pages/dashboard";
import PageBuilderPage from "@/pages/page-builder";
import PublicNudgPage from "@/pages/public-nudge";
import ExperimentEntryPage from "@/pages/experiment-entry";
import FeedbackPage from "@/pages/feedback";
import PricingPage from "@/pages/pricing";
import ProfilePage from "@/pages/profile";
import LandingPage from "@/pages/landing";
import AuthPage from "@/pages/auth";
import { LayoutDashboard, Sparkles, Pencil, MessageSquare, CreditCard, UserCircle, LogOut, LogIn, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { WorkspaceAccess } from "@/components/WorkspaceAccess";
import { reservedRootPageSlugs } from "@shared/schema";

function Navigation() {
  const [location] = useLocation();
  const { logout, isLoggingOut, user, isAuthenticated } = useAuth();
  
  const navItems = [
    { path: "/", label: "Home", icon: Sparkles, showAlways: true },
    { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard, showAlways: true },
    { path: "/builder", label: "Page Builder", mobileLabel: "Build", icon: Pencil, showAlways: true },
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
          {navItems.filter(item => ["/builder", "/pricing", "/feedback"].includes(item.path)).map(item => {
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
                  {item.mobileLabel || item.label}
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
            <Link href="/sign-in">
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
  const { isAuthenticated, isLoading, error, retry } = useAuth();
  const [location] = useLocation();

  const pathname = location.split(/[?#]/, 1)[0];
  const legacyPageSlug = pathname.match(/^\/n\/([a-z0-9-]+)$/)?.[1];
  if (legacyPageSlug) {
    return <Redirect to={`/${legacyPageSlug}${window.location.search}${window.location.hash}`} replace />;
  }
  if (pathname.startsWith('/n/')) {
    return <NotFound />;
  }
  if (pathname.startsWith('/e/')) {
    return <Route path="/e/:id" component={ExperimentEntryPage} />;
  }
  const rootPageSlug = pathname.match(/^\/([a-z0-9-]+)$/)?.[1];
  if (rootPageSlug && !reservedRootPageSlugs.has(rootPageSlug)) {
    return <Route path="/:slug"><PublicNudgPage key={pathname} /></Route>;
  }
  const isAuthRoute = pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up") || pathname === "/auth";
  const isWorkspaceRoute = ["/dashboard", "/builder", "/profile"].includes(pathname);
  
  return (
    <>
      <Navigation />
      {isAuthenticated && isWorkspaceRoute && isLoading ? (
        <div className="p-12 flex items-center justify-center gap-3"><Loader2 className="animate-spin h-5 w-5" />Loading your workspace…</div>
      ) : isAuthenticated && !isAuthRoute && error ? (
        <div role="alert" className="max-w-lg mx-auto p-8 space-y-4">
          <h2 className="text-xl font-semibold">Your account could not be loaded</h2>
          <p className="text-muted-foreground">Please retry. Your pages have not been replaced with demo data.</p>
          <Button onClick={() => void retry()}>Try again</Button>
        </div>
      ) : (
      <Switch>
        <Route path="/">{isAuthenticated ? <Redirect to="/dashboard" /> : <LandingPage />}</Route>
        <Route path="/dashboard"><WorkspaceAccess><DashboardPage /></WorkspaceAccess></Route>
        <Route path="/builder"><WorkspaceAccess><PageBuilderPage /></WorkspaceAccess></Route>
        <Route path="/pricing" component={PricingPage} />
        <Route path="/feedback" component={FeedbackPage} />
        <Route path="/sign-in/*?"><AuthPage /></Route>
        <Route path="/sign-up/*?"><AuthPage signUp /></Route>
        <Route path="/auth"><Redirect to="/sign-in" /></Route>
        <Route path="/profile">
          <WorkspaceAccess><ProfilePage /></WorkspaceAccess>
        </Route>
        <Route component={NotFound} />
      </Switch>
      )}
    </>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
    <ClerkAppProvider>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </ClerkAppProvider>
    </WouterRouter>
  );
}

export default App;
