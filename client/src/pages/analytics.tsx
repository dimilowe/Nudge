import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { TrendingUp, MousePointerClick, Target, Activity } from "lucide-react";

interface AnalyticsData {
  totalMatches: number;
  successfulMatches: number;
  clickThroughRate: number;
  averageMatchScore: number | null;
  topCards: Array<{ cardId: string; matchCount: number; clickCount: number; ctr: number }>;
  categoryStats: Array<{ category: string; matchCount: number; clickCount: number; ctr: number }>;
  topIntents: Array<{ intent: string; count: number }>;
  matchesByDate: Array<{ date: string; count: number }>;
}

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery<{ success: boolean; data: AnalyticsData }>({
    queryKey: ["/api/analytics"],
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Analytics Dashboard</h1>
            <p className="text-muted-foreground mt-2">Loading analytics data...</p>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader className="animate-pulse">
                <div className="h-4 bg-muted rounded w-24" />
                <div className="h-8 bg-muted rounded w-16 mt-2" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const analytics = data?.data;
  
  if (!analytics) {
    return (
      <div className="container mx-auto p-8">
        <Card>
          <CardHeader>
            <CardTitle>No Data Available</CardTitle>
            <CardDescription>Start using the extension to see analytics</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const categoryIcons: Record<string, string> = {
    shopping: "🛍️",
    food: "🍽️",
    jobs: "💼",
    saas: "💻",
    travel: "✈️",
    creator: "🎬"
  };

  return (
    <div className="container mx-auto p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold" data-testid="text-analytics-title">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-2">Track performance and user engagement</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-total-matches">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Matches</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-matches">{analytics.totalMatches}</div>
            <p className="text-xs text-muted-foreground mt-1">
              All match attempts
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-successful-matches">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Successful Matches</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-successful-matches">{analytics.successfulMatches}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.totalMatches > 0 
                ? `${((analytics.successfulMatches / analytics.totalMatches) * 100).toFixed(1)}% success rate`
                : "No matches yet"}
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-ctr">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Click-Through Rate</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-ctr">{analytics.clickThroughRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Users clicking CTAs
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-avg-score">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Match Quality</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-avg-score">
              {analytics.averageMatchScore !== null 
                ? `${analytics.averageMatchScore.toFixed(0)}%` 
                : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Match confidence
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card data-testid="card-top-cards">
          <CardHeader>
            <CardTitle>Top Help Cards</CardTitle>
            <CardDescription>Most matched cards by volume</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.topCards.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.topCards}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="cardId" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="matchCount" fill="hsl(var(--primary))" name="Matches" />
                  <Bar dataKey="clickCount" fill="hsl(var(--secondary))" name="Clicks" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-12">No data yet</p>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-category-performance">
          <CardHeader>
            <CardTitle>Category Performance</CardTitle>
            <CardDescription>Matches and CTR by category</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.categoryStats.length > 0 ? (
              <div className="space-y-4">
                {analytics.categoryStats.map(stat => (
                  <div key={stat.category} className="flex items-center justify-between" data-testid={`category-stat-${stat.category}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{categoryIcons[stat.category]}</span>
                      <div>
                        <p className="font-medium capitalize">{stat.category}</p>
                        <p className="text-sm text-muted-foreground">
                          {stat.matchCount} matches • {stat.clickCount} clicks
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{stat.ctr.toFixed(1)}%</p>
                      <p className="text-xs text-muted-foreground">CTR</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-12">No data yet</p>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-top-intents">
          <CardHeader>
            <CardTitle>Top User Intents</CardTitle>
            <CardDescription>Most common search phrases</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.topIntents.length > 0 ? (
              <div className="space-y-3">
                {analytics.topIntents.map((intent, idx) => (
                  <div key={idx} className="flex items-center justify-between" data-testid={`intent-${idx}`}>
                    <p className="text-sm font-medium truncate flex-1 mr-4">
                      "{intent.intent}"
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary"
                          style={{ 
                            width: `${(intent.count / analytics.topIntents[0].count) * 100}%` 
                          }}
                        />
                      </div>
                      <span className="text-sm font-bold min-w-[2rem] text-right">
                        {intent.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-12">No data yet</p>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-matches-timeline">
          <CardHeader>
            <CardTitle>Matches Over Time</CardTitle>
            <CardDescription>Daily match volume trend</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.matchesByDate.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={analytics.matchesByDate}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    name="Matches"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-12">No data yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
