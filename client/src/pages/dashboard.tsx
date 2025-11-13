import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, 
  Users, 
  MousePointerClick, 
  DollarSign,
  Smartphone,
  Monitor,
  Tablet
} from 'lucide-react';

export default function DashboardPage() {
  // Fetch demo data (creator + page)
  const { data: demoData, isLoading: demoLoading } = useQuery({
    queryKey: ['/api/demo'],
    queryFn: async () => {
      const res = await fetch('/api/demo');
      return res.json();
    },
  });

  const creator = demoData?.creator;
  const demoPage = demoData?.page;

  // Fetch pages for this creator
  const { data: pagesData, isLoading: pagesLoading } = useQuery({
    queryKey: ['/api/pages', creator?.id],
    queryFn: async () => {
      const res = await fetch(`/api/pages?creatorId=${creator.id}`);
      return res.json();
    },
    enabled: !!creator?.id,
  });

  // Fetch page analytics
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['/api/analytics/page', demoPage?.id],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/page/${demoPage.id}`);
      return res.json();
    },
    enabled: !!demoPage?.id,
  });

  // Fetch offers for the page
  const { data: offersData, isLoading: offersLoading } = useQuery({
    queryKey: ['/api/offers', demoPage?.id],
    queryFn: async () => {
      const res = await fetch(`/api/offers?pageId=${demoPage.id}`);
      return res.json();
    },
    enabled: !!demoPage?.id,
  });

  const pages = pagesData?.pages || [];
  const analytics = analyticsData?.analytics;
  const offers = offersData?.offers || [];

  const isLoading = demoLoading || pagesLoading || analyticsLoading || offersLoading;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl" data-testid="page-dashboard">
        <Skeleton className="h-10 w-64 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  const deviceIcon = (device: string) => {
    if (device === 'mobile') return <Smartphone className="h-4 w-4" />;
    if (device === 'tablet') return <Tablet className="h-4 w-4" />;
    return <Monitor className="h-4 w-4" />;
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl" data-testid="page-dashboard">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">Nudge Dashboard</h1>
        <p className="text-muted-foreground" data-testid="text-page-description">
          Your conversion intelligence at a glance
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Total Sessions</span>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-3xl font-bold" data-testid="text-total-sessions">
            {analytics?.totalSessions || 0}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Total Events</span>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-3xl font-bold" data-testid="text-total-events">
            {analytics?.totalEvents || 0}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Avg Time on Page</span>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-3xl font-bold" data-testid="text-avg-time">
            {analytics?.avgTimeOnPage ? `${Math.round(analytics.avgTimeOnPage)}s` : '0s'}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Revenue</span>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-3xl font-bold" data-testid="text-revenue">
            $0
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Traffic Sources */}
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4">Top Traffic Sources</h3>
          {analytics?.topTrafficSources && analytics.topTrafficSources.length > 0 ? (
            <div className="space-y-3">
              {analytics.topTrafficSources.map((source: any) => (
                <div key={source.source} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{source.source}</Badge>
                  </div>
                  <span className="font-semibold" data-testid={`text-source-${source.source}`}>
                    {source.count} sessions
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No traffic data yet</p>
          )}
        </Card>

        {/* Device Breakdown */}
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4">Device Breakdown</h3>
          {analytics?.deviceBreakdown && analytics.deviceBreakdown.length > 0 ? (
            <div className="space-y-3">
              {analytics.deviceBreakdown.map((device: any) => (
                <div key={device.device} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {deviceIcon(device.device)}
                    <span className="capitalize">{device.device}</span>
                  </div>
                  <span className="font-semibold" data-testid={`text-device-${device.device}`}>
                    {device.count} sessions
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No device data yet</p>
          )}
        </Card>
      </div>

      {/* Top Performing Offers */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">Top Performing Offers</h3>
        {analytics?.topOffers && analytics.topOffers.length > 0 ? (
          <div className="space-y-4">
            {analytics.topOffers.map((offer: any, index: number) => (
              <div 
                key={offer.offerId} 
                className="flex items-center justify-between p-4 bg-muted rounded-lg"
                data-testid={`card-offer-${index}`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="font-semibold" data-testid={`text-offer-title-${index}`}>
                      {offer.title}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {offer.clicks} clicks
                    </p>
                  </div>
                </div>
                <Badge variant="default">{offer.clicks}</Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No offer data yet</p>
            <p className="text-sm text-muted-foreground">
              Create offers and start tracking visitor behavior
            </p>
          </div>
        )}
      </Card>

      {/* Pages List */}
      <Card className="p-6 mt-6">
        <h3 className="text-xl font-semibold mb-4">Your Nudge Pages</h3>
        {pages.length > 0 ? (
          <div className="space-y-3">
            {pages.map((page: any) => (
              <div 
                key={page.id} 
                className="flex items-center justify-between p-4 bg-muted rounded-lg"
                data-testid={`card-page-${page.slug}`}
              >
                <div>
                  <h4 className="font-semibold" data-testid={`text-page-title-${page.slug}`}>
                    {page.title}
                  </h4>
                  <p className="text-sm text-muted-foreground">/{page.slug}</p>
                </div>
                <Badge variant={page.isPublished ? "default" : "secondary"}>
                  {page.isPublished ? "Published" : "Draft"}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No pages yet</p>
            <p className="text-sm text-muted-foreground">
              Create your first Nudge page to start converting visitors
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
