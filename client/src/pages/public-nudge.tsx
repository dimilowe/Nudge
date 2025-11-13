import { useState, useEffect, useRef } from 'react';
import { useRoute } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

// Detect device type
function getDeviceType(): 'mobile' | 'desktop' | 'tablet' {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

// Track scroll depth
function useScrollTracking(sessionId: string | null) {
  const [maxScrollDepth, setMaxScrollDepth] = useState(0);
  const trackEventMutation = useMutation({
    mutationFn: async (event: any) => {
      return await apiRequest('/api/track/event', 'POST', event);
    },
  });

  useEffect(() => {
    if (!sessionId) return;

    const handleScroll = () => {
      const scrollPercent = Math.round(
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
      );
      
      if (scrollPercent > maxScrollDepth) {
        setMaxScrollDepth(scrollPercent);
        
        // Track scroll milestones
        if ([25, 50, 75, 90].includes(scrollPercent)) {
          trackEventMutation.mutate({
            sessionId,
            eventType: 'scroll',
            meta: { scrollDepth: scrollPercent },
          });
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [sessionId, maxScrollDepth]);

  return maxScrollDepth;
}

// Track time on page
function useTimeTracking(sessionId: string | null) {
  const [timeOnPage, setTimeOnPage] = useState(0);
  const trackEventMutation = useMutation({
    mutationFn: async (event: any) => {
      return await apiRequest('/api/track/event', 'POST', event);
    },
  });

  useEffect(() => {
    if (!sessionId) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setTimeOnPage(elapsed);

      // Track time milestones
      if ([10, 30, 60].includes(elapsed)) {
        trackEventMutation.mutate({
          sessionId,
          eventType: 'page_view',
          meta: { timeOnPage: elapsed },
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionId]);

  return timeOnPage;
}

export default function PublicNudgePage() {
  const [, params] = useRoute('/n/:slug');
  const slug = params?.slug || '';
  
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayOffer, setOverlayOffer] = useState<any>(null);
  const scrollDepth = useScrollTracking(sessionId);
  const timeOnPage = useTimeTracking(sessionId);

  // Fetch page data
  const { data: pageData } = useQuery({
    queryKey: ['/api/pages', slug],
    queryFn: async () => {
      const res = await fetch(`/api/pages/${slug}`);
      return res.json();
    },
    enabled: !!slug,
  });

  const page = pageData?.page;

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('/api/track/session', 'POST', data);
    },
    onSuccess: (data: any) => {
      setSessionId(data.sessionId);
    },
  });

  // Track event mutation
  const trackEventMutation = useMutation({
    mutationFn: async (event: any) => {
      return await apiRequest('/api/track/event', 'POST', event);
    },
  });

  // Get routed offer
  const { data: routeData } = useQuery({
    queryKey: ['/api/route', sessionId, slug],
    queryFn: async () => {
      if (!sessionId) return null;
      const res = await fetch('/api/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, pageSlug: slug }),
      });
      return res.json();
    },
    enabled: !!sessionId && !!slug,
  });

  const offer = routeData?.offer;
  const automations = routeData?.automations || [];

  // Start session on mount
  useEffect(() => {
    if (!slug || sessionId) return;

    createSessionMutation.mutate({
      pageSlug: slug,
      referrer: document.referrer,
      device: getDeviceType(),
      os: navigator.userAgent.includes('Mac') ? 'macos' : 
          navigator.userAgent.includes('Windows') ? 'windows' :
          navigator.userAgent.includes('Android') ? 'android' :
          navigator.userAgent.includes('iOS') ? 'ios' : 'other',
    });
  }, [slug, sessionId]);

  // Track offer view when offer loads
  useEffect(() => {
    if (offer && sessionId) {
      trackEventMutation.mutate({
        sessionId,
        eventType: 'offer_view',
        meta: { offerId: offer.id },
      });
    }
  }, [offer?.id, sessionId]);

  // Check automations based on behavior
  useEffect(() => {
    if (!automations || automations.length === 0 || !sessionId) return;

    automations.forEach((automation: any) => {
      const config = automation.triggerConfig;

      // Scroll-depth trigger
      if (automation.triggerType === 'scroll_depth' && config.scrollPercent) {
        if (scrollDepth >= config.scrollPercent && !showOverlay) {
          setOverlayOffer(automation);
          setShowOverlay(true);
          trackEventMutation.mutate({
            sessionId,
            eventType: 'automation_triggered',
            meta: { automationId: automation.id, trigger: 'scroll_depth' },
          });
        }
      }

      // Time-based trigger
      if (automation.triggerType === 'time_on_page' && config.seconds) {
        if (timeOnPage >= config.seconds && !showOverlay) {
          setOverlayOffer(automation);
          setShowOverlay(true);
          trackEventMutation.mutate({
            sessionId,
            eventType: 'automation_triggered',
            meta: { automationId: automation.id, trigger: 'time_on_page' },
          });
        }
      }
    });
  }, [scrollDepth, timeOnPage, automations, sessionId, showOverlay]);

  // Track offer click
  const handleOfferClick = (clickedOffer: any) => {
    if (sessionId) {
      trackEventMutation.mutate({
        sessionId,
        eventType: 'offer_click',
        meta: { offerId: clickedOffer.id, href: clickedOffer.href },
      });
    }
    window.open(clickedOffer.href, '_blank');
  };

  if (!page) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Page Not Found</h2>
          <p className="text-muted-foreground">The page you're looking for doesn't exist.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100" data-testid="page-public-nudge">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4" data-testid="text-page-title">
            {page.title}
          </h1>
          {page.description && (
            <p className="text-xl text-muted-foreground" data-testid="text-page-description">
              {page.description}
            </p>
          )}
        </div>

        {/* Primary Offer */}
        {offer && (
          <Card className="p-8 mb-8 bg-white shadow-lg" data-testid="card-primary-offer">
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="default">Featured Offer</Badge>
              <Badge variant="outline">{offer.type}</Badge>
            </div>
            <h2 className="text-3xl font-bold mb-3" data-testid="text-offer-title">
              {offer.title}
            </h2>
            {offer.description && (
              <p className="text-lg text-muted-foreground mb-6" data-testid="text-offer-description">
                {offer.description}
              </p>
            )}
            {offer.imageUrl && (
              <img 
                src={offer.imageUrl} 
                alt={offer.title}
                className="w-full h-64 object-cover rounded-lg mb-6"
              />
            )}
            <Button 
              size="lg" 
              className="w-full text-lg py-6"
              onClick={() => handleOfferClick(offer)}
              data-testid="button-primary-cta"
            >
              {offer.cta} →
            </Button>
          </Card>
        )}

        {/* About Section */}
        <Card className="p-8 mb-8 bg-white">
          <h3 className="text-2xl font-semibold mb-4">Why This Works</h3>
          <p className="text-muted-foreground mb-4">
            This page is powered by Nudge - the conversion brain that shows you the right offer at the right time.
          </p>
          <ul className="space-y-2 text-muted-foreground">
            <li>✓ Personalized based on where you came from</li>
            <li>✓ Optimized for your device</li>
            <li>✓ Smart timing based on your engagement</li>
          </ul>
        </Card>

        {/* Scroll Tracking Debug Info (dev only) */}
        {process.env.NODE_ENV === 'development' && (
          <Card className="p-4 bg-muted">
            <div className="text-xs space-y-1">
              <div>Session ID: {sessionId || 'Loading...'}</div>
              <div>Scroll Depth: {scrollDepth}%</div>
              <div>Time on Page: {timeOnPage}s</div>
              <div>Automations: {automations.length}</div>
            </div>
          </Card>
        )}
      </div>

      {/* Overlay Dialog */}
      <Dialog open={showOverlay} onOpenChange={setShowOverlay}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-overlay">
          <DialogHeader>
            <DialogTitle>
              {overlayOffer?.overlayContent?.headline || "Don't Miss This!"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground mb-6">
              {overlayOffer?.overlayContent?.description || "We have something special for you."}
            </p>
            {overlayOffer?.offerId && offer && (
              <Button 
                className="w-full" 
                onClick={() => {
                  handleOfferClick(offer);
                  setShowOverlay(false);
                }}
                data-testid="button-overlay-cta"
              >
                {offer.cta} →
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
