import type { ReactNode } from "react";
import { Redirect } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useBilling } from "@/hooks/useBilling";
import { Button } from "./ui/button";
import { Loader2 } from "lucide-react";

export function WorkspaceAccess({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const billing = useBilling();
  if (auth.isLoading || (auth.user && billing.isLoading)) return (
    <div className="p-12 flex justify-center gap-3"><Loader2 className="h-5 w-5 animate-spin" />Checking workspace access…</div>
  );
  if (!auth.isAuthenticated) return <Redirect to="/sign-in?redirect_url=/pricing" />;
  if (billing.error) return (
    <div role="alert" className="max-w-lg mx-auto p-8 space-y-4">
      <h2 className="text-xl font-semibold">We couldn’t verify your subscription</h2>
      <p className="text-muted-foreground">Your published links are still live. Retry to check workspace access.</p>
      <Button onClick={() => void billing.refetch()}>Retry</Button>
    </div>
  );
  if (!billing.data?.hasAccess) return <Redirect to="/pricing" />;
  return <>{children}</>;
}
