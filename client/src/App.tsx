import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import DashboardPage from "@/pages/dashboard";
import PageBuilderPage from "@/pages/page-builder";
import PublicNudgePage from "@/pages/public-nudge";
import { LayoutDashboard, Sparkles, Pencil } from "lucide-react";

function Navigation() {
  const [location] = useLocation();
  
  // Don't show navigation on public pages
  if (location.startsWith('/n/')) {
    return null;
  }
  
  const navItems = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard },
    { path: "/builder", label: "Page Builder", icon: Pencil },
  ];

  return (
    <nav className="glass-card sticky top-0 z-50 border-b">
      <div className="container mx-auto px-8 py-4 flex items-center gap-8">
        <div className="flex items-center gap-3">
          <div className="gradient-primary p-2 rounded-xl">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gradient">
            Nudge
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
        <div className="ml-auto">
          <span className="text-sm font-medium bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            The Conversion Brain for Creators
          </span>
        </div>
      </div>
    </nav>
  );
}

function Router() {
  return (
    <>
      <Navigation />
      <Switch>
        <Route path="/" component={DashboardPage} />
        <Route path="/builder" component={PageBuilderPage} />
        <Route path="/n/:slug" component={PublicNudgePage} />
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
