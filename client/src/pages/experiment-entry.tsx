import { useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getVisitorId } from "@/lib/visitor-id";
import { getPublicPagePath } from "@/lib/page-url";

export default function ExperimentEntryPage() {
  const [, params] = useRoute("/e/:id");
  const [, navigate] = useLocation();
  const visitorKey = getVisitorId();
  const { data, isError, error } = useQuery({
    queryKey: ["experiment-entry", params?.id, visitorKey],
    queryFn: async () => {
      const res = await fetch(
        `/api/experiments/${encodeURIComponent(params!.id)}/resolve?visitorKey=${encodeURIComponent(visitorKey)}`,
        { cache: "no-store" },
      );
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "This test link is unavailable.");
      return body;
    },
    enabled: !!params?.id,
    staleTime: 0,
    gcTime: 0,
  });

  useEffect(() => {
    if (!data) return;
    const query = new URLSearchParams(window.location.search);
    query.delete("experimentId");
    query.delete("variantIndex");
    if (data.experimentId) {
      query.set("experimentId", data.experimentId);
      query.set("variantIndex", String(data.variantIndex));
    }
    const search = query.toString();
    navigate(`${getPublicPagePath(data.pageSlug)}${search ? `?${search}` : ""}`, { replace: true });
  }, [data, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-purple-600 to-blue-600">
      <Card className="p-8 text-center max-w-md" role={isError ? "alert" : "status"}>
        {isError ? (
          <>
            <h1 className="text-xl font-bold mb-2">Link unavailable</h1>
            <p className="text-muted-foreground">{error?.message}</p>
          </>
        ) : (
          <>
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-3" />
            <p>Opening the page…</p>
          </>
        )}
      </Card>
    </div>
  );
}
