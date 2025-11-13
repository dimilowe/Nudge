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
    <nav className="border-b bg-background sticky top-0 z-50">
      <div className="container mx-auto px-8 py-4 flex items-center gap-8">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Nudge
          </h1>
        </div>
        <div className="flex gap-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = location === item.path;
            return (
              <Link key={item.path} href={item.path}>
                <button 
                  className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                    isActive 
                      ? "bg-primary text-primary-foreground" 
                      : "hover:bg-muted"
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
          <span className="text-sm text-muted-foreground">
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
