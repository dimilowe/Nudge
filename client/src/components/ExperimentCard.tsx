import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { BarChart3, Copy, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Experiment, NudgPage } from "@shared/schema";

type VariantMetrics = {
  pageId: string;
  visitors: number;
  conversions: number;
  conversionRate: number;
};
type Metrics = {
  experiment: { status: string; totalVisitors: number; winnerId: string | null };
  variants: Record<string, VariantMetrics>;
};

async function request(method: string, url: string, data?: unknown) {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || "Request failed");
  return body;
}

export function ExperimentCard({
  experiment,
  pages,
  onEdit,
}: {
  experiment: Experiment;
  pages: NudgPage[];
  onEdit: () => void;
}) {
  const { toast } = useToast();
  const [showMetrics, setShowMetrics] = useState(false);
  const split = experiment.trafficSplit as { a: number; b: number; c: number };
  const arms = [
    { key: "a", pageId: experiment.variantAPageId, weight: split.a },
    { key: "b", pageId: experiment.variantBPageId, weight: split.b },
    { key: "c", pageId: experiment.variantCPageId, weight: split.c },
  ].filter((arm) => arm.weight > 0);
  const link = `${window.location.origin}/e/${experiment.id}`;
  const { data: metrics, isLoading, error } = useQuery<Metrics>({
    queryKey: ["/api/experiments", experiment.id, "metrics"],
    queryFn: () => request("GET", `/api/experiments/${experiment.id}/metrics`),
    enabled: showMetrics,
    staleTime: 0,
    refetchInterval: showMetrics ? 15000 : false,
  });
  const status = showMetrics && metrics ? metrics.experiment.status : experiment.status;
  const winnerId = metrics?.experiment.winnerId || experiment.winnerId;
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/experiments"] });
  };
  const update = useMutation({
    mutationFn: (data: { status?: string; winnerId?: string }) =>
      request("PUT", `/api/experiments/${experiment.id}`, data),
    onSuccess: () => {
      invalidate();
      toast({ title: "Experiment updated" });
    },
    onError: (error: Error) => toast({ title: error.message, variant: "destructive" }),
  });
  const remove = useMutation({
    mutationFn: () => request("DELETE", `/api/experiments/${experiment.id}`),
    onSuccess: () => {
      invalidate();
      toast({ title: "Experiment deleted" });
    },
    onError: (error: Error) => toast({ title: error.message, variant: "destructive" }),
  });
  const pageName = (id: string) => pages.find((page) => page.id === id)?.title || "Missing page";
  const rates = arms.map((arm) => metrics?.variants[arm.key]?.conversionRate || 0);
  const highestRate = Math.max(...rates);

  return (
    <Card className="p-5 space-y-4" data-testid={`card-experiment-${experiment.id}`}>
      <div className="flex flex-wrap justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-bold">{experiment.name}</h4>
            <Badge variant={status === "running" ? "default" : "outline"}>{status}</Badge>
          </div>
          {experiment.description && <p className="text-sm text-muted-foreground mt-1">{experiment.description}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {status !== "completed" && (
            <Button size="sm" disabled={update.isPending}
              onClick={() => update.mutate({ status: status === "running" ? "paused" : "running" })}
              data-testid={`button-run-experiment-${experiment.id}`}>
              {status === "running" ? "Pause test" : status === "paused" ? "Resume test" : "Start test"}
            </Button>
          )}
          {(status === "running" || status === "paused") && (
            <Button size="sm" variant="outline" disabled={update.isPending}
              onClick={() => {
                if (window.confirm("End this experiment? Results will be kept. The shared link will serve Variant A until you choose a winning page.")) {
                  update.mutate({ status: "completed" });
                }
              }}>End test</Button>
          )}
          {status === "draft" && (
            <Button size="sm" variant="outline" onClick={onEdit}><Pencil className="h-4 w-4 mr-1" />Edit</Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setShowMetrics(!showMetrics)}
            data-testid={`button-view-metrics-${experiment.id}`}>
            <BarChart3 className="h-4 w-4 mr-1" />{showMetrics ? "Hide" : "View"} results
          </Button>
          <Button size="sm" variant="ghost" aria-label={`Delete ${experiment.name}`} disabled={remove.isPending}
            onClick={() => {
              if (window.confirm("Delete this experiment? Its shared link will stop working and its results will no longer be available here.")) {
                remove.mutate();
              }
            }} data-testid={`button-delete-experiment-${experiment.id}`}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        {arms.map((arm) => (
          <div key={arm.key}>
            <p className="text-muted-foreground">Variant {arm.key.toUpperCase()} · {arm.weight}%</p>
            <p className="font-medium break-words">{pageName(arm.pageId)}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <InputLink value={link} />
        <Button size="sm" variant="outline" onClick={async () => {
          try {
            await navigator.clipboard.writeText(link);
            toast({ title: "Test link copied" });
          } catch {
            toast({ title: "Copy unavailable", description: "Select and copy the link above.", variant: "destructive" });
          }
        }} data-testid={`button-copy-test-link-${experiment.id}`}>
          <Copy className="h-4 w-4 mr-1" />Copy test link
        </Button>
        <a href={link} target="_blank" rel="noopener noreferrer" className="text-sm underline flex gap-1 items-center">
          Open link <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      <p className="text-xs text-muted-foreground">
        Share this one link for the test—not the individual page links.
        {status === "running" ? " Repeat visits stay on the same variation." :
          winnerId ? ` The link now serves ${pageName(winnerId)}.` :
            " While stopped, this link serves Variant A without adding test visitors."}
      </p>

      {showMetrics && (
        <div className="pt-4 border-t space-y-3">
          <h5 className="font-bold">Offer click results</h5>
          <p className="text-sm text-muted-foreground">
            {metrics ? `${metrics.experiment.totalVisitors} / ${experiment.targetVisitors}` : "—"} unique browser visitors.
            Tests stop taking new visitors when the target is reached; existing visitors can still click.
          </p>
          {isLoading && <p role="status" className="text-sm">Loading results…</p>}
          {error && <p role="alert" className="text-sm text-destructive">{error.message}</p>}
          {metrics && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {arms.map((arm) => {
                const result = metrics.variants[arm.key];
                return (
                  <Card key={arm.key} className="p-4 space-y-3">
                    <div>
                      <p className="font-medium">Variant {arm.key.toUpperCase()}</p>
                      <p className="text-xs text-muted-foreground break-words">{pageName(arm.pageId)}</p>
                      {winnerId === arm.pageId ? <Badge className="mt-2">Selected page</Badge> :
                        highestRate > 0 && result.conversionRate === highestRate && <Badge variant="secondary" className="mt-2">Leading by click rate</Badge>}
                    </div>
                    <dl className="space-y-1 text-sm">
                      <div className="flex justify-between gap-2"><dt>Visitors</dt><dd>{result.visitors}</dd></div>
                      <div className="flex justify-between gap-2"><dt>Visitors who clicked</dt><dd>{result.conversions}</dd></div>
                      <div className="flex justify-between gap-2 font-bold"><dt>Click rate</dt><dd>{result.conversionRate.toFixed(2)}%</dd></div>
                    </dl>
                    {status !== "draft" && winnerId !== arm.pageId && (
                      <Button size="sm" variant="outline" className="w-full" disabled={update.isPending}
                        onClick={() => {
                          if (window.confirm(`Finish the test and serve "${pageName(arm.pageId)}" to everyone using this test link? Results will be preserved.`)) {
                            update.mutate({ winnerId: arm.pageId });
                          }
                        }} data-testid={`button-select-winner-${arm.key}-${experiment.id}`}>
                        Use this page
                      </Button>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            A click means interest in an offer, not a purchase. Rates count each anonymous browser once, even with repeat visits or multiple clicks.
            Leading does not prove statistical significance. Clearing browser storage or changing devices counts as a new visitor.
          </p>
        </div>
      )}
    </Card>
  );
}

function InputLink({ value }: { value: string }) {
  return (
    <input readOnly value={value} aria-label="Shareable experiment link"
      onFocus={(event) => event.target.select()}
      className="flex-1 min-w-0 w-full sm:w-auto rounded-md border bg-muted/30 px-3 py-2 text-xs" />
  );
}
