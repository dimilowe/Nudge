import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { apiRequest } from "@/lib/queryClient";

export interface BillingStatus {
  hasAccess: boolean;
  status: string;
  trialEligible: boolean;
  trialEnd: number | null;
  customerId: string | null;
  cancelAtPeriodEnd: boolean;
  periodEnd: number | null;
}

export function useBilling() {
  const { user, isAuthenticated } = useAuth();
  return useQuery<BillingStatus>({
    queryKey: ["/api/stripe/subscription", user?.id],
    queryFn: async () => (await apiRequest("GET", "/api/stripe/subscription")).json(),
    enabled: isAuthenticated && !!user,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 30000,
    retry: 1,
  });
}
