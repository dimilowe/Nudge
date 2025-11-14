import { useState, useEffect, useRef } from 'react';
import { useRoute } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import useEmblaCarousel from 'embla-carousel-react';
import { OverlayPanel } from '@/components/OverlayPanel';

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

// Offers Carousel Component
function OffersCarousel({ offers, onOfferClick }: { offers: any[]; onOfferClick: (offer: any) => void }) {
  const [emblaRef] = useEmblaCarousel({ 
    loop: false, 
    align: 'start',
    slidesToScroll: 1,
    containScroll: 'trimSnaps',
  });
  
  const sortedOffers = offers
    .sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0))
    .filter((offer: any) => offer.isActive);

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-6">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
        <span className="text-sm font-semibold px-3 opacity-90">
          Swipe to explore →
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
      </div>
      
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-4">
          {sortedOffers.map((offer: any) => (
            <div
              key={offer.id}
              className="flex-[0_0_85%] md:flex-[0_0_45%] min-w-0"
            >
              <button
                onClick={() => onOfferClick(offer)}
                className="w-full bg-white/10 hover:bg-white/20 backdrop-blur-sm p-6 rounded-3xl border border-white/20 hover:border-white/40 transition-all group shadow-xl hover:shadow-2xl"
                data-testid={`button-offer-${offer.id}`}
              >
                <div className="text-left">
                  <div className="font-bold text-xl group-hover:text-purple-200 transition-colors mb-2">
                    {offer.title}
                  </div>
                  {offer.description && (
                    <div className="text-sm opacity-75 mb-4 line-clamp-2">{offer.description}</div>
                  )}
                  <div className="flex items-center justify-between">
                    <Badge className="bg-white/20 text-white border-white/30">
                      {offer.type.replace('_', ' ')}
                    </Badge>
                    <div className="text-2xl opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                      →
                    </div>
                  </div>
                </div>
              </button>
            </div>
          ))}
        </div>
      </div>
      
      <div className="text-center mt-6">
        <p className="text-sm opacity-60">← Swipe to see more offers →</p>
      </div>
    </div>
  );
}

export default function PublicNudgePage() {
  const [, params] = useRoute('/n/:slug');
  const slug = params?.slug || '';
  
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayOffer, setOverlayOffer] = useState<any>(null);
  const [showFloatingPanel, setShowFloatingPanel] = useState(false);
  const [floatingPanelCollapsed, setFloatingPanelCollapsed] = useState(true);
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
  
  // Fetch all offers for this page
  const { data: offersData } = useQuery({
    queryKey: ['/api/offers', page?.id],
    queryFn: async () => {
      const res = await fetch(`/api/offers?pageId=${page.id}`);
      return res.json();
    },
    enabled: !!page?.id,
  });
  
  const offers = offersData?.offers || [];

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
      
      // Show floating panel with smart-routed offer
      setShowFloatingPanel(true);
      setFloatingPanelCollapsed(false); // Auto-expand when offer appears
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600">
        <Card className="p-8 text-center bg-white/10 backdrop-blur-sm border-white/20 text-white">
          <h2 className="text-2xl font-bold mb-2">Page Not Found</h2>
          <p className="opacity-90">The page you're looking for doesn't exist.</p>
        </Card>
      </div>
    );
  }

  // Get content from page
  const content = page.content as any;
  const heroSection = content?.sections?.[0];
  const headline = heroSection?.headline || page.title;
  const subheadline = heroSection?.subheadline || page.description || '';

  // Get top 10 offers to display (prioritize routed offer first)
  const topOffers = [...offers]
    .sort((a: any, b: any) => {
      // Routed offer goes first
      if (offer && a.id === offer.id) return -1;
      if (offer && b.id === offer.id) return 1;
      // Then sort by displayOrder
      return (a.displayOrder || 0) - (b.displayOrder || 0);
    })
    .filter((o: any) => o.isActive)
    .slice(0, 10);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 text-white" data-testid="page-public-nudge">
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        {/* Hero Image Card */}
        <div className="mb-8">
          <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-md mx-auto">
            <div className="aspect-square bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl flex items-center justify-center">
              <div className="text-6xl">📸</div>
            </div>
          </div>
        </div>
        
        {/* Hero Text */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-black mb-4 tracking-tight" data-testid="text-page-title">
            {headline}
          </h1>
          {subheadline && (
            <p className="text-xl opacity-90 font-light" data-testid="text-page-description">
              {subheadline}
            </p>
          )}
        </div>

        {/* Top 10 AI-Selected Links */}
        {topOffers.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
              <span className="text-sm font-semibold px-3 opacity-90">
                {offer ? '🎯 Smart Picks For You' : 'Links'}
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
            </div>
            
            <div className="space-y-3">
              {topOffers.map((displayOffer: any, index: number) => (
                <button
                  key={displayOffer.id}
                  onClick={() => handleOfferClick(displayOffer)}
                  className={`w-full bg-white/10 hover:bg-white/20 backdrop-blur-sm p-5 rounded-2xl border transition-all group ${
                    offer && displayOffer.id === offer.id 
                      ? 'border-yellow-400/50 bg-white/15' 
                      : 'border-white/10 hover:border-purple-500/50'
                  }`}
                  data-testid={`button-top-offer-${index}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 text-left">
                      <div className="font-bold text-lg group-hover:text-purple-200 transition-colors flex items-center gap-2">
                        {offer && displayOffer.id === offer.id && (
                          <span className="text-yellow-400">⭐</span>
                        )}
                        {displayOffer.title}
                      </div>
                      {displayOffer.description && (
                        <div className="text-sm opacity-75 mt-1">{displayOffer.description}</div>
                      )}
                    </div>
                    <div className="ml-4 text-xl opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                      →
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* All Offers Carousel */}
        {offers.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-6">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
              <span className="text-sm font-semibold px-3 opacity-90">
                Explore All →
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
            </div>
            <OffersCarousel offers={offers} onOfferClick={handleOfferClick} />
          </div>
        )}
        
        {offers.length === 0 && (
          <div className="text-center py-12">
            <div className="bg-white/5 backdrop-blur-sm p-8 rounded-2xl border border-dashed border-white/20">
              <p className="opacity-60">No links available yet.</p>
            </div>
          </div>
        )}

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

      {/* Overlay Dialog (for automations) */}
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

      {/* Floating Overlay Panel (glass-morphism style) */}
      {showFloatingPanel && offer && (
        <OverlayPanel
          isCollapsed={floatingPanelCollapsed}
          onCollapsedChange={setFloatingPanelCollapsed}
          onClose={() => setShowFloatingPanel(false)}
          title="Smart Pick For You"
        >
          <div className="space-y-4">
            {/* Offer Card in Panel */}
            <div className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 p-4 rounded-lg border border-white/20">
              <div className="flex items-start gap-2 mb-2">
                <span className="text-xl">⭐</span>
                <div className="flex-1">
                  <h3 className="font-bold text-sm mb-1">{offer.title}</h3>
                  {offer.description && (
                    <p className="text-xs opacity-80 line-clamp-2 mb-3">{offer.description}</p>
                  )}
                  <Button
                    size="sm"
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    onClick={() => handleOfferClick(offer)}
                    data-testid="button-floating-offer"
                  >
                    {offer.cta || 'Check it out'} →
                  </Button>
                </div>
              </div>
            </div>

            {/* Info Text */}
            <div className="text-xs opacity-60 text-center px-2">
              <p>💡 This offer was specially selected based on your profile</p>
            </div>
          </div>
        </OverlayPanel>
      )}
    </div>
  );
}
