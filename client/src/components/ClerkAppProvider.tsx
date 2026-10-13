import { useEffect, useRef, type ReactNode } from "react";
import { ClerkProvider, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { useLocation } from "wouter";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
export const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) throw new Error("Missing Clerk publishable key.");

const clerkAppearance = {
  theme: shadcn,
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#7c3aed",
    colorForeground: "#17172e",
    colorMutedForeground: "#5b5b7a",
    colorDanger: "#dc2626",
    colorBackground: "#ffffff",
    colorInput: "#f4f2fa",
    colorInputForeground: "#17172e",
    colorNeutral: "#44445e",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: { width: "100%", display: "flex", justifyContent: "center" },
    cardBox: { backgroundColor: "#ffffff", borderRadius: "1rem", width: "440px", maxWidth: "100%", overflow: "hidden" },
    card: { boxShadow: "none", border: "0", backgroundColor: "transparent", borderRadius: "0" },
    footer: { boxShadow: "none", border: "0", backgroundColor: "transparent", borderRadius: "0" },
    headerTitle: { color: "#17172e" },
    headerSubtitle: { color: "#5b5b7a" },
    socialButtonsBlockButtonText: { color: "#17172e" },
    formFieldLabel: { color: "#17172e" },
    footerActionLink: { color: "#6d28d9" },
    footerActionText: { color: "#5b5b7a" },
    dividerText: { color: "#5b5b7a" },
    identityPreviewEditButton: { color: "#6d28d9" },
    formFieldSuccessText: { color: "#15803d" },
    alertText: { color: "#991b1b" },
    logoBox: { justifyContent: "center" },
    logoImage: { height: "40px" },
    socialButtonsBlockButton: { backgroundColor: "#ffffff", border: "1px solid #dedbe9" },
    formButtonPrimary: { backgroundColor: "#7c3aed", color: "#ffffff" },
    formFieldInput: { backgroundColor: "#f4f2fa", color: "#17172e" },
    footerAction: { backgroundColor: "#f9f7ff" },
    dividerLine: { backgroundColor: "#dedbe9" },
    alert: { backgroundColor: "#fef2f2" },
    otpCodeFieldInput: { backgroundColor: "#f4f2fa", color: "#17172e" },
    formFieldRow: { marginBottom: "1rem" },
    main: { gap: "1.25rem" },
  },
};

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const client = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) client.clear();
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, client]);
  return null;
}

export function ClerkAppProvider({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      signInFallbackRedirectUrl={`${basePath}/dashboard`}
      signUpFallbackRedirectUrl={`${basePath}/dashboard`}
      localization={{
        signIn: { start: { title: "Welcome back to Nudg", subtitle: "Sign in to manage your pages and split tests" } },
        signUp: { start: { title: "Create your Nudg account", subtitle: "Build pages and find the offers that resonate" } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        {children}
      </QueryClientProvider>
    </ClerkProvider>
  );
}
