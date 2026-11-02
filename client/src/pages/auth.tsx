import { SignIn, SignUp } from "@clerk/react";
import { basePath } from "@/components/ClerkAppProvider";
import { pricingAuthReturn } from "@/lib/billing-navigation";

export default function AuthPage({ signUp = false }: { signUp?: boolean }) {
  const returnToPricing = pricingAuthReturn(window.location.search, basePath);
  const returnQuery = returnToPricing ? `?redirect_url=${encodeURIComponent(returnToPricing)}` : "";
  return (
    <div className="min-h-[calc(100dvh-80px)] flex flex-col items-center justify-center px-4 py-10 gap-5">
      {signUp ? (
        <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in${returnQuery}`} forceRedirectUrl={returnToPricing} />
      ) : (
        <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up${returnQuery}`} forceRedirectUrl={returnToPricing} />
      )}
      <p className="max-w-md text-center text-sm text-muted-foreground px-4">
        Create your account to start a 14-day trial of All Access. No card is required upfront; after your trial, All Access is $22 USD/month.
      </p>
    </div>
  );
}
