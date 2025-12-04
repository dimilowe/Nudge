import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Sparkles, Zap, Crown, Loader2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface StripeProduct {
  id: string;
  name: string;
  description: string;
  metadata: { tier?: string };
  prices: {
    id: string;
    unit_amount: number;
    currency: string;
    recurring: { interval: string };
  }[];
}

const planConfig: Record<string, { icon: any; features: string[]; popular: boolean }> = {
  Starter: {
    icon: Sparkles,
    features: [
      "1 Nudg page",
      "Up to 10 offers",
      "Basic analytics",
      "5 automations",
      "Email support",
    ],
    popular: false,
  },
  Pro: {
    icon: Zap,
    features: [
      "5 Nudg pages",
      "Unlimited offers",
      "Advanced analytics",
      "Unlimited automations",
      "A/B/C testing",
      "Priority support",
      "Custom branding",
    ],
    popular: true,
  },
  Elite: {
    icon: Crown,
    features: [
      "Unlimited Nudg pages",
      "Unlimited offers",
      "Real-time analytics",
      "Unlimited automations",
      "Advanced A/B/C testing",
      "Dedicated support",
      "White-label solution",
      "API access",
      "Custom integrations",
    ],
    popular: false,
  },
};

export default function PricingPage() {
  const { toast } = useToast();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const { data: productsData, isLoading } = useQuery<{ products: StripeProduct[] }>({
    queryKey: ["/api/stripe/products"],
  });

  const checkoutMutation = useMutation({
    mutationFn: async ({ priceId, planName }: { priceId: string; planName: string }) => {
      const response = await apiRequest("POST", "/api/stripe/create-checkout", {
        priceId,
        planName,
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start checkout",
        variant: "destructive",
      });
      setLoadingPlan(null);
    },
  });

  const handleChoosePlan = (priceId: string, planName: string) => {
    setLoadingPlan(planName);
    checkoutMutation.mutate({ priceId, planName });
  };

  const products = productsData?.products || [];
  
  const orderedPlans = ["Starter", "Pro", "Elite"]
    .map((name) => products.find((p) => p.name === name))
    .filter(Boolean) as StripeProduct[];

  const fallbackPlans = [
    { name: "Starter", price: 8, priceId: null },
    { name: "Pro", price: 15, priceId: null },
    { name: "Elite", price: 35, priceId: null },
  ];

  const displayPlans = orderedPlans.length > 0 ? orderedPlans : null;

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-5xl font-bold text-gradient mb-4">
            Choose Your Plan
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Scale your conversion optimization with flexible pricing that grows with you
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 md:gap-8 mb-12">
          {isLoading ? (
            <div className="col-span-3 flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            </div>
          ) : displayPlans ? (
            displayPlans.map((product) => {
              const config = planConfig[product.name] || { icon: Sparkles, features: [], popular: false };
              const Icon = config.icon;
              const price = product.prices[0];
              const priceAmount = price ? price.unit_amount / 100 : 0;

              return (
                <Card
                  key={product.id}
                  className={`glass-card p-6 md:p-8 relative ${
                    config.popular
                      ? "border-purple-500 border-2 shadow-xl shadow-purple-500/20"
                      : ""
                  }`}
                  data-testid={`card-plan-${product.name.toLowerCase()}`}
                >
                  {config.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="gradient-primary px-4 py-1.5 rounded-full text-white text-sm font-semibold shadow-lg">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="text-center mb-6">
                    <div className={`inline-flex p-3 rounded-xl mb-4 ${
                      config.popular ? "gradient-primary" : "bg-muted"
                    }`}>
                      <Icon className={`h-8 w-8 ${config.popular ? "text-white" : "text-purple-500"}`} />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">{product.name}</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      {product.description || config.features[0]}
                    </p>
                    <div className="flex items-baseline justify-center gap-1 mb-1">
                      <span className="text-4xl font-bold text-gradient">
                        ${priceAmount}
                      </span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {config.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <div className="mt-0.5">
                          <Check className="h-5 w-5 text-purple-500 shrink-0" />
                        </div>
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant={config.popular ? "default" : "outline"}
                    className={`w-full ${
                      config.popular
                        ? "gradient-primary text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50"
                        : "border-2 border-purple-400/50 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950/30 text-purple-600 dark:text-purple-400 font-semibold hover:shadow-md transition-all"
                    }`}
                    size="lg"
                    disabled={!price || loadingPlan === product.name}
                    onClick={() => price && handleChoosePlan(price.id, product.name)}
                    data-testid={`button-select-${product.name.toLowerCase()}`}
                  >
                    {loadingPlan === product.name ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Choose {product.name}
                  </Button>
                </Card>
              );
            })
          ) : (
            fallbackPlans.map((plan) => {
              const config = planConfig[plan.name];
              const Icon = config.icon;

              return (
                <Card
                  key={plan.name}
                  className={`glass-card p-6 md:p-8 relative ${
                    config.popular
                      ? "border-purple-500 border-2 shadow-xl shadow-purple-500/20"
                      : ""
                  }`}
                  data-testid={`card-plan-${plan.name.toLowerCase()}`}
                >
                  {config.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="gradient-primary px-4 py-1.5 rounded-full text-white text-sm font-semibold shadow-lg">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="text-center mb-6">
                    <div className={`inline-flex p-3 rounded-xl mb-4 ${
                      config.popular ? "gradient-primary" : "bg-muted"
                    }`}>
                      <Icon className={`h-8 w-8 ${config.popular ? "text-white" : "text-purple-500"}`} />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      {config.features[0]}
                    </p>
                    <div className="flex items-baseline justify-center gap-1 mb-1">
                      <span className="text-4xl font-bold text-gradient">
                        ${plan.price}
                      </span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {config.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <div className="mt-0.5">
                          <Check className="h-5 w-5 text-purple-500 shrink-0" />
                        </div>
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant={config.popular ? "default" : "outline"}
                    className={`w-full ${
                      config.popular
                        ? "gradient-primary text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50"
                        : "border-2 border-purple-400/50 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950/30 text-purple-600 dark:text-purple-400 font-semibold hover:shadow-md transition-all"
                    }`}
                    size="lg"
                    disabled
                    data-testid={`button-select-${plan.name.toLowerCase()}`}
                  >
                    Loading...
                  </Button>
                </Card>
              );
            })
          )}
        </div>

        <div className="glass-card p-6 md:p-8 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-6 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Why Nudg?</h3>
              <p className="text-muted-foreground text-sm">
                Nudg is the only link-in-bio platform built for conversions. With AI-powered smart routing, behavioral triggers that display offers at the perfect moment, A/B/C testing to optimize your results, and beautiful glass-morphism design - you'll turn more visitors into customers. Build for free, publish when you're ready.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Can I change plans later?</h3>
              <p className="text-muted-foreground text-sm">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">What payment methods do you accept?</h3>
              <p className="text-muted-foreground text-sm">
                We accept all major credit cards, PayPal, and ACH transfers for annual plans.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Can I cancel anytime?</h3>
              <p className="text-muted-foreground text-sm">
                Yes, you can cancel your subscription at any time. Your access continues until the end of your billing period.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
