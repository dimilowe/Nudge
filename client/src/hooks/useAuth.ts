import { useState } from "react";
import { useUser, useClerk } from "@clerk/react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { basePath } from "@/components/ClerkAppProvider";

interface AuthUser {
  id: string;
  username: string;
  email?: string | null;
}

export function useAuth() {
  const { user: clerkUser, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const account = useQuery<AuthUser>({
    queryKey: ["/api/auth/me", clerkUser?.id],
    queryFn: async () => (await apiRequest("GET", "/api/auth/me")).json(),
    enabled: isLoaded && !!isSignedIn,
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5,
  });
  const user = isSignedIn ? account.data || null : null;
  return {
    user,
    isLoading: !isLoaded || (!!isSignedIn && account.isLoading),
    isAuthenticated: !!isSignedIn,
    error: isSignedIn ? account.error : null,
    retry: account.refetch,
    isLoggingOut,
    logout: async () => {
      setIsLoggingOut(true);
      try {
        await signOut({ redirectUrl: basePath || "/" });
      } finally {
        setIsLoggingOut(false);
      }
    },
  };
}
