import { Button } from "@/components/ui/button";
import { Sparkles, Zap, Target, BarChart3, Layers, ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b sticky top-0 z-50 bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="gradient-primary p-2 rounded-xl">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-gradient">Nudg</span>
          </div>
          <Button 
            onClick={() => window.location.href = '/api/login'}
            className="gradient-primary text-white"
            data-testid="button-login"
          >
            Sign In
          </Button>
        </div>
      </nav>

      <section className="container mx-auto px-6 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            The <span className="text-gradient">Conversion Brain</span> for Creators
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Transform your link-in-bio into an AI-powered sales machine. Smart routing, behavioral triggers, 
            and A/B testing that automatically shows the right offer to the right visitor.
          </p>
          <div className="flex gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={() => window.location.href = '/api/login'}
              className="gradient-primary text-white px-8"
              data-testid="button-get-started"
            >
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <FeatureCard
            icon={Target}
            title="Smart Routing"
            description="AI determines the best offer based on traffic source, device, and visitor behavior."
          />
          <FeatureCard
            icon={Zap}
            title="Behavioral Triggers"
            description="Show offers at the perfect moment with scroll depth, time-on-page, and hesitation detection."
          />
          <FeatureCard
            icon={Layers}
            title="A/B/C Testing"
            description="Run experiments across page variants and automatically find your winner."
          />
          <FeatureCard
            icon={BarChart3}
            title="Conversion Analytics"
            description="Track every click, view, and conversion with detailed traffic source breakdowns."
          />
        </div>
      </section>

      <section className="bg-muted/50 py-16">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to boost your conversions?</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Join thousands of creators using Nudg to turn their audience into customers.
          </p>
          <Button 
            size="lg" 
            onClick={() => window.location.href = '/api/login'}
            className="gradient-primary text-white px-8"
            data-testid="button-cta-bottom"
          >
            Start for Free
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="container mx-auto px-6 text-center text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Nudg. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }: { 
  icon: typeof Target;
  title: string;
  description: string;
}) {
  return (
    <div className="glass-card p-6 rounded-2xl" data-testid={`card-feature-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="gradient-primary w-12 h-12 rounded-xl flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-white" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  );
}
