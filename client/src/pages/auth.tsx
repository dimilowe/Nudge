import { SignIn, SignUp } from "@clerk/react";
import { basePath } from "@/components/ClerkAppProvider";

export default function AuthPage({ signUp = false }: { signUp?: boolean }) {
  const returnToPricing = new URLSearchParams(window.location.search).get("redirect_url") === "/pricing";
  return (
    <div className="min-h-[calc(100dvh-80px)] flex flex-col items-center justify-center px-4 py-10 gap-5">
      {signUp ? (
        <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} forceRedirectUrl={returnToPricing ? "/pricing" : undefined} />
      ) : (
        <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} forceRedirectUrl={returnToPricing ? "/pricing" : undefined} />
      )}
      <p className="max-w-md text-center text-sm text-muted-foreground px-4">
        Create your account to start a 14-day trial of All Access. No card is required upfront; after your trial, All Access is $22 USD/month.
      </p>
    </div>
  );
}
