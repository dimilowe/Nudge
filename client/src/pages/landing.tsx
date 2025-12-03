import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Zap, Target, BarChart3, Layers, ArrowRight, Check, Play, MousePointerClick, Users, TrendingUp } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <section className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 text-purple-700 text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            The smart link-in-bio for creators who want to sell more
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Turn Every Click Into a{" "}
            <span className="text-gradient">Conversion</span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Stop losing sales to one-size-fits-all links. Nudg uses AI-powered smart routing 
            to show the perfect offer to every visitor based on where they came from and how they behave.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link href="/builder">
              <Button size="lg" className="gradient-primary text-white text-lg px-8 py-6" data-testid="cta-try-free">
                <Play className="mr-2 h-5 w-5" />
                Try the Builder Free
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6" data-testid="cta-view-pricing">
                View Pricing
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
          
          <p className="text-sm text-muted-foreground">
            No credit card required. Build your page first, pay when you're ready to publish.
          </p>
        </div>
      </section>

      <section className="bg-muted/50 py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why Creators Choose Nudg</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Your link-in-bio shouldn't show the same thing to everyone. 
              Different visitors have different intents - serve them accordingly.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <FeatureCard 
              icon={Target}
              title="Smart Routing"
              description="Automatically show different offers based on traffic source, device, and visitor behavior. TikTok visitors get your freebie, email subscribers see your premium course."
            />
            <FeatureCard 
              icon={Zap}
              title="Behavioral Triggers"
              description="Pop the right offer at the right moment. Exit intent, scroll depth, time on page - turn hesitation into action with perfectly timed nudges."
            />
            <FeatureCard 
              icon={Layers}
              title="A/B/C Testing"
              description="Stop guessing which offer converts best. Run experiments with automatic traffic splitting and let the data decide your winner."
            />
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">The Offer Deck Experience</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A beautiful, swipeable card carousel that showcases your offers in a 
              modern glass-morphism design. Visitors can explore all your products in one place.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
            <div>
              <div className="space-y-6">
                <BenefitItem 
                  icon={MousePointerClick}
                  title="Swipe to Discover"
                  description="Mobile-first design lets visitors naturally explore your offers with intuitive swipe gestures."
                />
                <BenefitItem 
                  icon={Users}
                  title="Hidden Offers"
                  description="Reveal special offers only to engaged visitors who've viewed your page multiple times."
                />
                <BenefitItem 
                  icon={TrendingUp}
                  title="Real-time Analytics"
                  description="See exactly which offers get the most clicks and optimize your funnel accordingly."
                />
              </div>
            </div>
            <div className="relative">
              <div className="glass-card p-6 rounded-2xl border shadow-2xl">
                <div className="space-y-4">
                  <div className="h-32 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center">
                    <span className="text-4xl">🎯</span>
                  </div>
                  <h3 className="font-semibold text-lg">Your Best-Selling Offer</h3>
                  <p className="text-sm text-muted-foreground">Automatically shown to high-intent visitors from email campaigns</p>
                  <Button className="w-full gradient-primary text-white">Get Started</Button>
                </div>
              </div>
              <div className="absolute -bottom-4 -right-4 glass-card p-4 rounded-xl border shadow-lg bg-background/80 backdrop-blur">
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="font-medium">247 clicks today</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-muted/50 py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Boost Your Conversions?</h2>
            <p className="text-muted-foreground mb-8">
              Build your smart link-in-bio page now. No signup required to start - 
              only pay when you're ready to go live.
            </p>
            <Link href="/builder">
              <Button size="lg" className="gradient-primary text-white text-lg px-8 py-6" data-testid="cta-start-building">
                Start Building Your Page
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
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

function FeatureCard({ icon: Icon, title, description }: { icon: typeof Target; title: string; description: string }) {
  return (
    <Card className="border-0 shadow-lg">
      <CardContent className="p-6">
        <div className="gradient-primary p-3 rounded-xl w-fit mb-4">
          <Icon className="h-6 w-6 text-white" />
        </div>
        <h3 className="font-semibold text-lg mb-2">{title}</h3>
        <p className="text-muted-foreground text-sm">{description}</p>
      </CardContent>
    </Card>
  );
}

function BenefitItem({ icon: Icon, title, description }: { icon: typeof Target; title: string; description: string }) {
  return (
    <div className="flex gap-4">
      <div className="gradient-primary p-2 rounded-lg h-fit">
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <h4 className="font-semibold mb-1">{title}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
