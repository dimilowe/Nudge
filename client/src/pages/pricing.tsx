import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { basePath } from "@/components/ClerkAppProvider";
import { pricingSignInUrl } from "@/lib/billing-navigation";
import { useBilling } from "@/hooks/useBilling";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowRight, Check, CircleAlert, CreditCard, Loader2, LockKeyhole, RefreshCw, Sparkles } from "lucide-react";

type BillingAction = "checkout" | "portal" | null;

const capabilities = [
  "Build and publish Nudg pages",
  "Create and manage offers",
  "Route visitors to relevant offers",
  "Behavior-based automations",
  "Split-test page variations",
  "Track performance with analytics",
];

function formatDate(timestamp: number | null) {
  if (!timestamp) return null;
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestamp * 1000));
}

export default function PricingPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const billing = useBilling();
  const { data, isLoading, error, refetch } = billing;
  const { toast } = useToast();
  const [action, setAction] = useState<BillingAction>(null);
  const [checkoutPending, setCheckoutPending] = useState(false);
  const [pollTimedOut, setPollTimedOut] = useState(false);
  const checkoutReturned = new URLSearchParams(window.location.search).get("checkout") === "success";

  useEffect(() => {
    if (!checkoutReturned || authLoading || !isAuthenticated || data?.hasAccess) {
      setCheckoutPending(false);
      setPollTimedOut(false);
      return;
    }
    setCheckoutPending(true);
    setPollTimedOut(false);
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      void refetch().then((result) => {
        if (result.data?.hasAccess) {
          setCheckoutPending(false);
          window.clearInterval(timer);
        }
      });
      if (attempts >= 15) {
        window.clearInterval(timer);
        setCheckoutPending(false);
        setPollTimedOut(true);
      }
    }, 2000);
    return () => window.clearInterval(timer);
  }, [checkoutReturned, authLoading, isAuthenticated, data?.hasAccess, refetch]);

  const startCheckout = async () => {
    if (!isAuthenticated) {
      window.location.href = checkoutReturned ? pricingSignInUrl(basePath) : `${basePath}/sign-up?redirect_url=${encodeURIComponent(`${basePath}/pricing`)}`;
      return;
    }
    setAction("checkout");
    try {
      const response = await apiRequest("POST", "/api/stripe/create-checkout");
      const result = await response.json();
      if (!result.url) throw new Error("Checkout could not be started. Please try again.");
      window.location.href = result.url;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Checkout could not be started.";
      toast({ title: "Unable to start checkout", description: message, variant: "destructive" });
      setAction(null);
    }
  };

  const openPortal = async () => {
    setAction("portal");
    try {
      const response = await apiRequest("POST", "/api/stripe/portal");
      const result = await response.json();
      if (!result.url) throw new Error("The billing portal is not available. Please try again.");
      window.location.href = result.url;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Billing management could not be opened.";
      toast({ title: "Unable to open billing", description: message, variant: "destructive" });
      setAction(null);
    }
  };

  const status = data?.status?.toLowerCase() ?? "";
  const trialEnd = formatDate(data?.trialEnd ?? null);
  const periodEnd = formatDate(data?.periodEnd ?? null);
  const billingLoading = authLoading || (isAuthenticated && isLoading);
  const workspaceAccess = Boolean(data?.hasAccess);
   const isTrial = status === "trialing";
   const locked = isAuthenticated && !billingLoading && !error && !workspaceAccess && data?.trialEligible === false;
   const requiresRepair = ["past_due", "unpaid", "paused", "incomplete", "trial_expired"].includes(status);
  const statusLabel: Record<string, string> = {
    active: "Subscription active",
    trialing: "14-day trial",
    past_due: "Payment needs attention",
    unpaid: "Payment overdue",
    canceled: "Subscription ended",
    incomplete: "Checkout not completed",
    incomplete_expired: "Checkout expired",
    paused: "Subscription paused",
     trial_expired: "Trial ended",
  };

  return (
    <main className="min-h-[100dvh] px-4 py-10 sm:px-6 md:py-16">
      <div className="mx-auto max-w-6xl">
        <header className="mx-auto mb-10 max-w-3xl text-center md:mb-14">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-purple-300/60 bg-purple-100/70 px-4 py-2 text-sm font-semibold text-purple-800 dark:border-purple-800 dark:bg-purple-950/50 dark:text-purple-200">
            <Sparkles className="h-4 w-4" />
            One plan. Every creator tool.
          </div>
          <h1 className="mb-5 text-4xl font-bold tracking-tight text-gradient sm:text-5xl md:text-6xl">
            Make every page work harder.
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Get the complete Nudg workspace with a 14-day trial. No card upfront. Add a payment method before your trial ends to continue at $22/month.
          </p>
        </header>

        {checkoutReturned && (
          <section
            className={`mx-auto mb-7 max-w-4xl rounded-2xl border p-4 sm:p-5 ${
              workspaceAccess
                ? "border-emerald-300/70 bg-emerald-50/80 dark:border-emerald-900 dark:bg-emerald-950/30"
                : "border-purple-300/70 bg-purple-50/80 dark:border-purple-900 dark:bg-purple-950/30"
            }`}
            aria-live="polite"
          >
            <div className="flex items-start gap-3">
              {workspaceAccess ? (
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-300" />
              ) : authLoading || checkoutPending ? (
                <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-purple-700 dark:text-purple-300" />
              ) : (
                <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-purple-700 dark:text-purple-300" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {authLoading ? "Restoring your sign-in…"
                    : !isAuthenticated ? "Sign back in to check your trial"
                    : workspaceAccess
                    ? "Your Nudg workspace is ready."
                    : checkoutPending
                      ? "Confirming your subscription…"
                      : "Your checkout is still being confirmed."}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {authLoading ? "Please wait while we restore your account."
                    : !isAuthenticated ? "Your checkout may already be complete. Sign in with the same account you used to start your trial so we can confirm access. You don’t need to start another trial."
                    : workspaceAccess
                    ? "Your access is confirmed. You can head to your workspace."
                    : checkoutPending
                      ? "This usually takes a few seconds. We’ll verify access before unlocking your workspace."
                      : "We haven’t confirmed access yet. You can retry the check, or contact us if you just completed checkout."}
                </p>
              </div>
              {!authLoading && !isAuthenticated ? (
                <Link href={pricingSignInUrl(basePath).slice(basePath.length)}>
                  <Button size="sm">Sign in to continue</Button>
                </Link>
              ) : isAuthenticated && !authLoading && !workspaceAccess && !checkoutPending && (
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  onClick={() => {
                    setPollTimedOut(false);
                    setCheckoutPending(true);
                    void refetch().finally(() => {
                      setCheckoutPending(false);
                      setPollTimedOut(true);
                    });
                  }}
                  aria-label="Retry subscription confirmation"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </Button>
              )}
            </div>
          </section>
        )}

        {isAuthenticated && error && (
          <section className="mx-auto mb-7 flex max-w-4xl flex-col gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-5 sm:flex-row sm:items-center sm:justify-between" role="alert">
            <div>
              <p className="font-semibold">We couldn’t load your billing status.</p>
              <p className="mt-1 text-sm text-muted-foreground">Your subscription details haven’t changed. Retry to check your access.</p>
            </div>
            <Button variant="outline" onClick={() => void refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" /> Retry
            </Button>
          </section>
        )}

        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.85fr)] lg:gap-8">
          <Card className="relative overflow-hidden border-purple-300/70 bg-card p-6 shadow-xl shadow-purple-950/10 dark:border-purple-900 sm:p-9">
            <div className="absolute inset-x-0 top-0 h-1.5 gradient-primary" />
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-purple-700 dark:text-purple-300">All Access</p>
                <h2 className="text-2xl font-bold">The full Nudg workspace</h2>
              </div>
              <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-800 dark:bg-purple-950 dark:text-purple-200">
                14 days on us
              </span>
            </div>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Everything already in Nudg, included in one membership. Try the complete toolkit before your first payment.
            </p>

            <div className="my-7 flex items-end gap-2 border-b border-border pb-7">
              <span className="text-5xl font-bold tracking-tight sm:text-6xl">$22</span>
              <span className="pb-2 text-muted-foreground">USD / month</span>
            </div>

            <ul className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              {capabilities.map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 rounded-xl border border-purple-200/80 bg-purple-50/70 p-4 dark:border-purple-900 dark:bg-purple-950/35">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <CreditCard className="h-4 w-4 text-purple-700 dark:text-purple-300" />
                No payment card required to start
              </p>
              <p className="mt-1.5 pl-6 text-sm leading-relaxed text-muted-foreground">
                Your trial expires unless you add a payment method. If it ends without payment, workspace access pauses; pages you’ve published remain live.
              </p>
            </div>

            {billingLoading ? (
              <div className="mt-7 h-12 animate-pulse rounded-lg bg-muted" aria-label="Loading subscription details" />
            ) : workspaceAccess ? (
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link href="/dashboard" className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg gradient-primary px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90">
                  Go to workspace <ArrowRight className="h-4 w-4" />
                </Link>
                {data?.customerId && (
                  <Button variant="outline" className="min-h-11 sm:px-5" onClick={openPortal} disabled={action !== null}>
                    {action === "portal" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                    Manage billing
                  </Button>
                )}
              </div>
            ) : isAuthenticated ? (
              <Button className="mt-7 h-12 w-full gradient-primary text-white sm:w-auto sm:min-w-64" onClick={requiresRepair ? openPortal : startCheckout} disabled={action !== null || !!error}>
                {action ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {requiresRepair ? "Update payment details" : data?.trialEligible === false ? "Continue to $22/month" : "Start my 14-day trial"}
                {!action && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            ) : (
              <Button className="mt-7 h-12 w-full gradient-primary text-white sm:w-auto sm:min-w-64" onClick={startCheckout}>
                {checkoutReturned ? "Sign in to check my trial" : "Start my 14-day trial"} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
            {locked && (
              <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
                <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
                {status === "past_due" || status === "unpaid"
                  ? "Workspace access is paused until your payment is updated. Published pages remain live."
                  : "Workspace access is paused. Published pages remain live while you reactivate All Access."}
              </p>
            )}
          </Card>

          <aside className="flex flex-col gap-5">
            <Card className="p-6 sm:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Your account</p>
              {billingLoading ? (
                <div className="mt-5 space-y-3" aria-label="Loading account status">
                  <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-full animate-pulse rounded bg-muted" />
                  <div className="h-10 w-full animate-pulse rounded bg-muted" />
                </div>
              ) : !isAuthenticated ? (
                <>
                  <h2 className="mt-3 text-xl font-bold">{checkoutReturned ? "Let’s restore your access" : "Ready when you are"}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {checkoutReturned ? "Use the same account as checkout. We’ll look up your existing trial after you sign in." : "Create an account to start your trial. Your card details stay out of the signup flow."}
                  </p>
                </>
              ) : error ? (
                <>
                  <h2 className="mt-3 text-xl font-bold">Status unavailable</h2>
                  <p className="mt-2 text-sm text-muted-foreground">Retry to see your current access and billing details.</p>
                </>
              ) : data?.hasAccess ? (
                <>
                  <span className="mt-4 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                    {statusLabel[status] || "All Access enabled"}
                  </span>
                  {isTrial && trialEnd && (
                    <div className="mt-4 rounded-xl border border-amber-300/70 bg-amber-50/70 p-4 dark:border-amber-900 dark:bg-amber-950/30">
                      <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">Trial ends {trialEnd}</p>
                      <p className="mt-1 text-sm leading-relaxed text-amber-900/80 dark:text-amber-200/80">
                        Add a payment method before then to keep workspace access. If the trial expires without payment, your published pages remain live.
                      </p>
                    </div>
                  )}
                  {data?.cancelAtPeriodEnd && periodEnd && (
                    <p className="mt-4 rounded-xl bg-muted/70 p-4 text-sm leading-relaxed text-muted-foreground">
                      Your subscription is set to end on <strong className="text-foreground">{periodEnd}</strong>. Your workspace remains available until then; published pages remain live afterward.
                    </p>
                  )}
                  {!isTrial && !data?.cancelAtPeriodEnd && periodEnd && (
                    <p className="mt-4 text-sm text-muted-foreground">Next billing date: <strong className="text-foreground">{periodEnd}</strong></p>
                  )}
                  {status === "past_due" && (
                    <p className="mt-4 rounded-xl border border-amber-300/70 bg-amber-50/70 p-4 text-sm leading-relaxed text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                      Update your payment method in billing management to avoid an interruption to workspace access.
                    </p>
                  )}
                </>
              ) : (
                <>
                  <span className={`mt-4 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${locked ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200" : "bg-muted text-muted-foreground"}`}>
                    {locked ? statusLabel[status] || "Workspace access paused" : "No active subscription"}
                  </span>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {status === "past_due" || status === "unpaid"
                      ? "Update your payment details to restore workspace access. Your published pages remain live."
                      : data?.trialEligible === false
                        ? "Your trial isn’t available for this account. Continue to checkout for All Access at $22 USD/month."
                      : "Start All Access for a 14-day trial. If a trial ends without payment, workspace access pauses while published pages stay live."}
                  </p>
                  {locked && data?.customerId && (
                    <Button variant="outline" className="mt-5 w-full" onClick={openPortal} disabled={action !== null}>
                      {action === "portal" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                      Manage billing
                    </Button>
                  )}
                </>
              )}
            </Card>

            <Card className="border-border/70 bg-muted/40 p-6 sm:p-7">
              <h2 className="font-bold">Straightforward by design</h2>
              <div className="mt-4 space-y-4 text-sm">
                <div className="flex gap-3">
                  <span className="font-mono text-xs text-purple-700 dark:text-purple-300">01</span>
                  <p className="text-muted-foreground"><strong className="text-foreground">Try everything.</strong> Your 14-day trial includes the complete creator workspace.</p>
                </div>
                <div className="flex gap-3">
                  <span className="font-mono text-xs text-purple-700 dark:text-purple-300">02</span>
                  <p className="text-muted-foreground"><strong className="text-foreground">No card upfront.</strong> Begin without entering payment details.</p>
                </div>
                <div className="flex gap-3">
                  <span className="font-mono text-xs text-purple-700 dark:text-purple-300">03</span>
                  <p className="text-muted-foreground"><strong className="text-foreground">Keep your live pages.</strong> Published pages stay online even if workspace access pauses.</p>
                </div>
              </div>
            </Card>
          </aside>
        </div>

        {checkoutReturned && pollTimedOut && !workspaceAccess && (
          <p className="mx-auto mt-5 max-w-5xl text-center text-sm text-muted-foreground">
            Still waiting? Retry the status check above. Checkout success alone doesn’t confirm an active subscription.
          </p>
        )}

        <footer className="mx-auto mt-10 max-w-5xl border-t border-border/70 pt-5 text-center text-xs text-muted-foreground">
          $22 USD per month after the 14-day trial. Billing details and subscription changes are available through billing management.
        </footer>
      </div>
    </main>
  );
}
