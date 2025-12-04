import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Sparkles, Zap, Crown } from "lucide-react";

export default function PricingPage() {
  const plans = [
    {
      name: "Starter",
      price: 8,
      icon: Sparkles,
      description: "Perfect for getting started",
      features: [
        "1 Nudg page",
        "Up to 10 offers",
        "Basic analytics",
        "5 automations",
        "Email support",
      ],
      cta: "Choose Starter",
      popular: false,
    },
    {
      name: "Pro",
      price: 15,
      icon: Zap,
      description: "For growing creators",
      features: [
        "5 Nudg pages",
        "Unlimited offers",
        "Advanced analytics",
        "Unlimited automations",
        "A/B/C testing",
        "Priority support",
        "Custom branding",
      ],
      cta: "Choose Pro",
      popular: true,
    },
    {
      name: "Elite",
      price: 35,
      icon: Crown,
      description: "For power users",
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
      cta: "Choose Elite",
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gradient mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Scale your conversion optimization with flexible pricing that grows with you
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <Card
                key={plan.name}
                className={`glass-card p-8 relative ${
                  plan.popular
                    ? "border-purple-500 border-2 shadow-xl shadow-purple-500/20"
                    : ""
                }`}
                data-testid={`card-plan-${plan.name.toLowerCase()}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="gradient-primary px-4 py-1.5 rounded-full text-white text-sm font-semibold shadow-lg">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="text-center mb-6">
                  <div className={`inline-flex p-3 rounded-xl mb-4 ${
                    plan.popular ? "gradient-primary" : "bg-muted"
                  }`}>
                    <Icon className={`h-8 w-8 ${plan.popular ? "text-white" : "text-purple-500"}`} />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    {plan.description}
                  </p>
                  <div className="flex items-baseline justify-center gap-1 mb-1">
                    <span className="text-4xl font-bold text-gradient">
                      ${plan.price}
                    </span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="mt-0.5">
                        <Check className="h-5 w-5 text-purple-500 shrink-0" />
                      </div>
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={plan.popular ? "default" : "outline"}
                  className={`w-full ${
                    plan.popular
                      ? "gradient-primary text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50"
                      : "border-2 border-purple-400/50 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950/30 text-purple-600 dark:text-purple-400 font-semibold hover:shadow-md transition-all"
                  }`}
                  size="lg"
                  data-testid={`button-select-${plan.name.toLowerCase()}`}
                >
                  {plan.cta}
                </Button>
              </Card>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="glass-card p-8 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-6 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
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
