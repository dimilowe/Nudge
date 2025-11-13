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
      <div className="mb-10">
        <h1 className="text-4xl font-bold mb-3 text-gradient" data-testid="text-page-title">Nudge Dashboard</h1>
        <p className="text-lg text-muted-foreground" data-testid="text-page-description">
          Your conversion intelligence at a glance
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <Card className="glass-card p-6 hover:shadow-2xl transition-shadow border-purple-200/50 dark:border-purple-500/30">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground">Total Sessions</span>
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
              <Users className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent" data-testid="text-total-sessions">
            {analytics?.totalSessions || 0}
          </div>
        </Card>

        <Card className="glass-card p-6 hover:shadow-2xl transition-shadow border-blue-200/50 dark:border-blue-500/30">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground">Total Events</span>
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600">
              <MousePointerClick className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent" data-testid="text-total-events">
            {analytics?.totalEvents || 0}
          </div>
        </Card>

        <Card className="glass-card p-6 hover:shadow-2xl transition-shadow border-pink-200/50 dark:border-pink-500/30">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground">Avg Time on Page</span>
            <div className="p-2 rounded-lg bg-gradient-to-br from-pink-500 to-pink-600">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent" data-testid="text-avg-time">
            {analytics?.avgTimeOnPage ? `${Math.round(analytics.avgTimeOnPage)}s` : '0s'}
          </div>
        </Card>

        <Card className="glass-card p-6 hover:shadow-2xl transition-shadow border-green-200/50 dark:border-green-500/30">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground">Revenue</span>
            <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-green-600">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent" data-testid="text-revenue">
            $0
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Traffic Sources */}
        <Card className="glass-card p-6 hover:shadow-2xl transition-shadow">
          <h3 className="text-xl font-bold mb-5 text-gradient">Top Traffic Sources</h3>
          {analytics?.topTrafficSources && analytics.topTrafficSources.length > 0 ? (
            <div className="space-y-3">
              {analytics.topTrafficSources.map((source: any) => (
                <div key={source.source} className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2">
                    <Badge className="gradient-primary text-white border-0">{source.source}</Badge>
                  </div>
                  <span className="font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent" data-testid={`text-source-${source.source}`}>
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
        <Card className="glass-card p-6 hover:shadow-2xl transition-shadow">
          <h3 className="text-xl font-bold mb-5 text-gradient">Device Breakdown</h3>
          {analytics?.deviceBreakdown && analytics.deviceBreakdown.length > 0 ? (
            <div className="space-y-3">
              {analytics.deviceBreakdown.map((device: any) => (
                <div key={device.device} className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                      {deviceIcon(device.device)}
                    </div>
                    <span className="capitalize font-medium">{device.device}</span>
                  </div>
                  <span className="font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent" data-testid={`text-device-${device.device}`}>
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
      <Card className="glass-card p-6 hover:shadow-2xl transition-shadow mb-6">
        <h3 className="text-xl font-bold mb-5 text-gradient">Top Performing Offers</h3>
        {analytics?.topOffers && analytics.topOffers.length > 0 ? (
          <div className="space-y-4">
            {analytics.topOffers.map((offer: any, index: number) => (
              <div 
                key={offer.offerId} 
                className="flex items-center justify-between p-5 rounded-xl bg-gradient-to-r from-purple-50 via-pink-50 to-blue-50 dark:from-purple-900/20 dark:via-pink-900/20 dark:to-blue-900/20 hover:shadow-lg transition-all"
                data-testid={`card-offer-${index}`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full gradient-primary text-white font-bold shadow-lg">
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="font-bold text-lg" data-testid={`text-offer-title-${index}`}>
                      {offer.title}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {offer.clicks} clicks
                    </p>
                  </div>
                </div>
                <Badge className="gradient-accent text-white border-0 px-4 py-1 text-lg">{offer.clicks}</Badge>
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
      <Card className="glass-card p-6 hover:shadow-2xl transition-shadow">
        <h3 className="text-xl font-bold mb-5 text-gradient">Your Nudge Pages</h3>
        {pages.length > 0 ? (
          <div className="space-y-3">
            {pages.map((page: any) => (
              <div 
                key={page.id} 
                className="flex items-center justify-between p-5 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 hover:shadow-lg transition-all"
                data-testid={`card-page-${page.slug}`}
              >
                <div>
                  <h4 className="font-bold text-lg" data-testid={`text-page-title-${page.slug}`}>
                    {page.title}
                  </h4>
                  <p className="text-sm text-muted-foreground font-medium">/{page.slug}</p>
                </div>
                <Badge className={page.isPublished ? "gradient-primary text-white border-0" : "bg-muted"}>
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
