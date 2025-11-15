import { useState, useEffect, useRef, useMemo } from 'react';
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

// Track mouse pause duration (for hesitation triggers)
function useMousePauseDuration(sessionId: string | null): number {
  const [pauseDuration, setPauseDuration] = useState(0);
  const lastMoveTimeRef = useRef(Date.now());

  useEffect(() => {
    if (!sessionId) return;

    const handleMouseMove = () => {
      lastMoveTimeRef.current = Date.now();
      setPauseDuration(0);
    };

    const interval = setInterval(() => {
      const elapsed = (Date.now() - lastMoveTimeRef.current) / 1000; // in seconds
      setPauseDuration(elapsed);
    }, 100); // Check every 100ms

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearInterval(interval);
    };
  }, [sessionId]);

  return pauseDuration;
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

// Offer Deck Component - Swipeable card stack for the overlay panel
function OfferDeck({ 
  offers, 
  selectedOffer, 
  onOfferClick,
  sessionId,
  trackEvent
}: { 
  offers: any[]; 
  selectedOffer: any | null;
  onOfferClick: (offer: any) => void;
  sessionId: string | null;
  trackEvent: (event: any) => void;
}) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: false, 
    align: 'start',
    slidesToScroll: 1,
  });
  const viewTimersRef = useRef<Map<string, number>>(new Map());
  const lastSwipeIndexRef = useRef<number>(-1);
  const prevFilteredOfferIdsRef = useRef<Set<string>>(new Set());
  const currentVisibleOfferIdRef = useRef<string | null>(null);
  const lastSettledOfferIdRef = useRef<string | null>(null);

  const activeOffers = useMemo(() => {
    return offers
      .filter((o: any) => o.isActive)
      .sort((a: any, b: any) => {
        // Selected offer goes first
        if (selectedOffer && a.id === selectedOffer.id) return -1;
        if (selectedOffer && b.id === selectedOffer.id) return 1;
        return (a.displayOrder || 0) - (b.displayOrder || 0);
      });
  }, [offers, selectedOffer]);

  // Get unique categories
  const categories = Array.from(new Set(activeOffers.map((o: any) => o.type)));
  
  // Filter by category if selected (show all when no category selected)
  // Always include the Smart Pick offer even if it doesn't match the selected category
  // Memoize to prevent observer effect from re-running on every render
  const filteredOffers = useMemo(() => {
    return !selectedCategory
      ? activeOffers
      : activeOffers.filter((o: any) => {
          // Always show the selected offer (Smart Pick)
          if (selectedOffer && o.id === selectedOffer.id) return true;
          // Otherwise filter by category
          return o.type === selectedCategory;
        });
  }, [activeOffers, selectedCategory, selectedOffer]);

  // Track category selection
  const handleCategorySelect = (category: string | null) => {
    setSelectedCategory(category);
    if (sessionId) {
      trackEvent({
        sessionId,
        eventType: 'category_selected',
        meta: { category },
      });
    }
  };

  // Initialize lastSettledOfferIdRef when carousel mounts
  useEffect(() => {
    if (!emblaApi) return;
    
    const selectedIndex = emblaApi.selectedScrollSnap();
    const initialOffer = filteredOffers[selectedIndex];
    if (initialOffer) {
      lastSettledOfferIdRef.current = initialOffer.id;
      lastSwipeIndexRef.current = selectedIndex;
    }
  }, [emblaApi, filteredOffers]);

  // Initialize prevFilteredOfferIdsRef on mount
  useEffect(() => {
    prevFilteredOfferIdsRef.current = new Set(filteredOffers.map((o: any) => o.id));
  }, []);

  // Flush timers for offers that are removed from filteredOffers (e.g., category change)
  useEffect(() => {
    if (!sessionId) return;

    const currentOfferIds = new Set(filteredOffers.map((o: any) => o.id));
    const prevOfferIds = prevFilteredOfferIdsRef.current;

    // Find offers that were removed
    const removedOfferIds = Array.from(prevOfferIds).filter(id => !currentOfferIds.has(id));

    // Flush timers for removed offers
    removedOfferIds.forEach(offerId => {
      if (viewTimersRef.current.has(offerId)) {
        const startTime = viewTimersRef.current.get(offerId);
        if (startTime) {
          const duration = Date.now() - startTime;
          trackEvent({
            sessionId,
            eventType: 'card_view_end',
            meta: { offerId, duration },
          });
        }
        viewTimersRef.current.delete(offerId);
      }
    });

    // Update the previous set for next comparison
    prevFilteredOfferIdsRef.current = currentOfferIds;
  }, [filteredOffers, sessionId, trackEvent]);

  // Track card swipes using Embla API (only fire once per index change)
  useEffect(() => {
    if (!emblaApi || !sessionId) return;

    const onSelect = () => {
      const selectedIndex = emblaApi.selectedScrollSnap();
      
      // Only fire if the index actually changed
      if (selectedIndex === lastSwipeIndexRef.current) return;
      
      // Flush timer for the card that was settled on carousel BEFORE this swipe
      // This is the authoritative cleanup - happens regardless of observer timing
      if (lastSettledOfferIdRef.current && viewTimersRef.current.has(lastSettledOfferIdRef.current)) {
        const startTime = viewTimersRef.current.get(lastSettledOfferIdRef.current);
        if (startTime) {
          const duration = Date.now() - startTime;
          trackEvent({
            sessionId,
            eventType: 'card_view_end',
            meta: { offerId: lastSettledOfferIdRef.current, duration },
          });
          viewTimersRef.current.delete(lastSettledOfferIdRef.current);
        }
      }
      
      const offer = filteredOffers[selectedIndex];
      if (offer) {
        trackEvent({
          sessionId,
          eventType: 'card_swipe',
          meta: { 
            offerId: offer.id,
            cardIndex: selectedIndex,
            direction: selectedIndex > lastSwipeIndexRef.current ? 'next' : 'prev'
          },
        });
        lastSwipeIndexRef.current = selectedIndex;
        lastSettledOfferIdRef.current = offer.id; // Track which offer carousel settled on
      }
    };

    // Use 'select' event instead of 'scroll' - fires only when carousel settles on new index
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, sessionId, filteredOffers, trackEvent]);

  // Track card views using Intersection Observer
  useEffect(() => {
    if (!sessionId) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const offerId = entry.target.getAttribute('data-offer-id');
          if (!offerId) return;

          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            // Card came into view (>50% visible)
            if (!viewTimersRef.current.has(offerId)) {
              trackEvent({
                sessionId,
                eventType: 'card_view_start',
                meta: { offerId },
              });
              
              // Start timer and update visible card tracking
              viewTimersRef.current.set(offerId, Date.now());
              currentVisibleOfferIdRef.current = offerId;
            }
          } else if (viewTimersRef.current.has(offerId)) {
            // Card left view OR dropped below 50% - calculate duration
            // This handles both complete exit and partial visibility (e.g., carousel swipe)
            const startTime = viewTimersRef.current.get(offerId);
            if (startTime) {
              const duration = Date.now() - startTime;
              trackEvent({
                sessionId,
                eventType: 'card_view_end',
                meta: { offerId, duration },
              });
              viewTimersRef.current.delete(offerId);
            }
          }
        });
      },
      {
        threshold: [0, 0.5, 1],
        root: null,
      }
    );

    // Observe all card elements
    const cardElements = document.querySelectorAll('[data-offer-id]');
    cardElements.forEach(el => observer.observe(el));

    // Don't flush timers on effect cleanup - only disconnect observer
    return () => observer.disconnect();
  }, [sessionId, filteredOffers, trackEvent]);

  // Flush all remaining timers only on component unmount
  useEffect(() => {
    return () => {
      // If there are any timers, flush them (sessionId must be valid if timers exist)
      if (viewTimersRef.current.size > 0 && sessionId) {
        viewTimersRef.current.forEach((startTime, offerId) => {
          const duration = Date.now() - startTime;
          trackEvent({
            sessionId,
            eventType: 'card_view_end',
            meta: { offerId, duration },
          });
        });
        viewTimersRef.current.clear();
      }
    };
  }, [sessionId, trackEvent]);

  if (!selectedOffer && filteredOffers.length === 0) {
    return (
      <div className="text-center py-6 px-4">
        <div className="text-4xl mb-3">✨</div>
        <p className="text-sm opacity-80 mb-1">Browse around!</p>
        <p className="text-xs opacity-60">We'll surface picks as you explore</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Category Filter Pills */}
      {categories.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => handleCategorySelect(null)}
            className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-all ${
              !selectedCategory
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                : 'bg-white/10 hover:bg-white/20'
            }`}
            data-testid="button-category-all"
          >
            All
          </button>
          {categories.map((cat: any) => (
            <button
              key={cat}
              onClick={() => handleCategorySelect(cat)}
              className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                  : 'bg-white/10 hover:bg-white/20'
              }`}
              data-testid={`button-category-${cat}`}
            >
              {cat.replace('_', ' ')}
            </button>
          ))}
        </div>
      )}

      {/* Swipeable Offer Cards */}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-3">
          {filteredOffers.slice(0, 5).map((offer: any, index: number) => (
            <div
              key={offer.id}
              className="flex-[0_0_100%] min-w-0"
              data-offer-id={offer.id}
              data-card-index={index}
            >
              <div className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 p-4 rounded-xl border border-white/20 backdrop-blur-sm">
                <div className="flex items-start gap-3 mb-3">
                  {offer.imageUrl ? (
                    <img 
                      src={offer.imageUrl} 
                      alt={offer.title}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-2xl">
                      {offer.type === 'digital_product' ? '📦' : 
                       offer.type === 'freebie' ? '🎁' :
                       offer.type === 'coaching' ? '💡' :
                       offer.type === 'bundle' ? '🎯' :
                       offer.type === 'affiliate' ? '🔗' : '✨'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm mb-1 line-clamp-1">{offer.title}</h3>
                    {offer.price && (
                      <p className="text-xs font-semibold text-purple-300">${offer.price}</p>
                    )}
                  </div>
                  {selectedOffer?.id === offer.id && (
                    <Badge className="bg-purple-500/50 text-white border-purple-400 text-xs">
                      Smart Pick
                    </Badge>
                  )}
                </div>

                {offer.description && (
                  <p className="text-xs opacity-80 line-clamp-2 mb-3">
                    {offer.description}
                  </p>
                )}

                <Button
                  size="sm"
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg"
                  onClick={() => onOfferClick(offer)}
                  data-testid={`button-deck-offer-${offer.id}`}
                >
                  {offer.cta || 'Check it out'} →
                </Button>

                {/* Offer Type Badge */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
                  <Badge className="bg-white/10 text-white border-white/20 text-xs">
                    {offer.type.replace('_', ' ')}
                  </Badge>
                  {offer.funnelStage && (
                    <span className="text-xs opacity-60">
                      {offer.funnelStage === 'awareness' ? '🌱' :
                       offer.funnelStage === 'consideration' ? '🤔' :
                       offer.funnelStage === 'core' ? '⭐' :
                       offer.funnelStage === 'upsell' ? '💎' : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Swipe Indicator */}
      {filteredOffers.length > 1 && (
        <div className="text-center">
          <p className="text-xs opacity-50">← Swipe for more →</p>
        </div>
      )}

      {/* Smart Pick Info */}
      {selectedOffer && (
        <div className="text-xs opacity-60 text-center px-2 pt-2 border-t border-white/10">
          <p>💡 This offer was specially selected for you</p>
        </div>
      )}
    </div>
  );
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
  const [panelOffer, setPanelOffer] = useState<any>(null);
  const [floatingPanelCollapsed, setFloatingPanelCollapsed] = useState(true);
  const [triggeredAutomations, setTriggeredAutomations] = useState<Set<string>>(new Set());
  const panelClaimedRef = useRef(false); // Prevents race condition in automation loop
  const scrollDepth = useScrollTracking(sessionId);
  const timeOnPage = useTimeTracking(sessionId);
  const mousePauseDuration = useMousePauseDuration(sessionId);

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

  // Track offer view when panel displays an offer
  useEffect(() => {
    if (panelOffer && sessionId) {
      trackEventMutation.mutate({
        sessionId,
        eventType: 'offer_view',
        meta: { offerId: panelOffer.id, source: 'panel' },
      });
    }
  }, [panelOffer?.id, sessionId]);

  // Reset panel claim when offer is cleared
  useEffect(() => {
    if (!panelOffer) {
      panelClaimedRef.current = false;
    }
  }, [panelOffer]);

  // Check automations based on behavior (with race prevention)
  useEffect(() => {
    if (!automations || automations.length === 0 || !sessionId) return;
    if (panelClaimedRef.current) return; // Panel already claimed this cycle

    for (const automation of automations) {
      // Skip if already triggered
      if (triggeredAutomations.has(automation.id)) continue;

      const config = automation.triggerConfig;
      let shouldTrigger = false;

      // Scroll-depth trigger
      if (automation.triggerType === 'scroll_depth' && config.scrollPercent) {
        shouldTrigger = scrollDepth >= config.scrollPercent;
      }

      // Time-based trigger
      if (automation.triggerType === 'time_on_page' && config.seconds) {
        shouldTrigger = timeOnPage >= config.seconds;
      }

      // User hesitation trigger (respect configured threshold, default to 3 seconds)
      if (automation.triggerType === 'user_hesitation') {
        const threshold = config.hesitationSeconds || 3;
        shouldTrigger = mousePauseDuration >= threshold;
      }

      // Bottom proximity trigger (respect configured threshold, default to 80%)
      if (automation.triggerType === 'bottom_proximity') {
        const threshold = config.scrollPercent || 80;
        shouldTrigger = scrollDepth >= threshold;
      }

      // If this automation should trigger, claim the panel and expand it
      if (shouldTrigger) {
        // Check if automation has a specific target offer or is general (no offerId)
        if (automation.offerId) {
          // Automation targets a specific offer - only proceed if offer exists
          const targetOffer = offers.find((o: any) => o.id === automation.offerId);
          if (targetOffer) {
            panelClaimedRef.current = true;
            setPanelOffer(targetOffer);
            setFloatingPanelCollapsed(false);
            setTriggeredAutomations(prev => new Set([...Array.from(prev), automation.id]));
            trackEventMutation.mutate({
              sessionId,
              eventType: 'automation_triggered',
              meta: { 
                automationId: automation.id, 
                trigger: automation.triggerType,
                offerId: targetOffer.id 
              },
            });
            break; // Stop checking other automations
          }
          // Else: target offer not found yet, don't claim panel (will retry on next effect run)
        } else {
          // Automation has no specific offer - show general deck
          panelClaimedRef.current = true;
          setPanelOffer(null); // Clear any specific offer to show general deck
          setFloatingPanelCollapsed(false);
          setTriggeredAutomations(prev => new Set([...Array.from(prev), automation.id]));
          trackEventMutation.mutate({
            sessionId,
            eventType: 'automation_triggered',
            meta: { 
              automationId: automation.id, 
              trigger: automation.triggerType,
              offerId: undefined 
            },
          });
          break; // Stop checking other automations
        }
      }
    }
  }, [scrollDepth, timeOnPage, mousePauseDuration, automations, sessionId, triggeredAutomations, offers]);

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
  const heroImage = heroSection?.heroImage;
  const bgStyle = heroSection?.backgroundColor || 'gradient';
  const backgroundImage = heroSection?.backgroundImage;

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

  // Check if background image is actually usable (not empty/whitespace/null)
  const hasUsableBackgroundImage = backgroundImage && backgroundImage.trim().length > 0;

  return (
    <div 
      className={`min-h-screen text-white ${
        bgStyle === 'solid'
          ? 'bg-slate-900'
          : bgStyle === 'gradient'
          ? 'bg-gradient-to-br from-purple-600 to-blue-600'
          : bgStyle === 'image' && hasUsableBackgroundImage
          ? ''
          : 'bg-gradient-to-br from-purple-600 to-blue-600'
      }`}
      data-testid="page-public-nudge"
      style={
        bgStyle === 'image' && hasUsableBackgroundImage
          ? {
              backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url(${backgroundImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundAttachment: 'fixed',
            }
          : undefined
      }
    >
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        {/* Hero Image Card */}
        <div className="mb-8">
          <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-md mx-auto">
            {heroImage ? (
              <img 
                src={heroImage} 
                alt="Hero" 
                className="aspect-square w-full rounded-2xl object-cover"
              />
            ) : (
              <div className="aspect-square bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl flex items-center justify-center">
                <div className="text-6xl">📸</div>
              </div>
            )}
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

      {/* Floating Overlay Panel (glass-morphism style) - Always present if automations exist */}
      {(automations.length > 0 || offers.length > 0) && (
        <OverlayPanel
          isCollapsed={floatingPanelCollapsed}
          onCollapsedChange={setFloatingPanelCollapsed}
          onClose={() => {
            setPanelOffer(null);
            setFloatingPanelCollapsed(true);
            if (sessionId) {
              trackEventMutation.mutate({
                sessionId,
                eventType: 'panel_close',
                meta: { offerId: panelOffer?.id },
              });
            }
          }}
          title={panelOffer ? "Smart Pick For You" : "Nudge"}
        >
          <OfferDeck
            offers={offers}
            selectedOffer={panelOffer}
            onOfferClick={handleOfferClick}
            sessionId={sessionId}
            trackEvent={trackEventMutation.mutate}
          />
        </OverlayPanel>
      )}
    </div>
  );
}
