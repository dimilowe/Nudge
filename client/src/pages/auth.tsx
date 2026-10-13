import { SignIn, SignUp } from "@clerk/react";
import { basePath } from "@/components/ClerkAppProvider";

export default function AuthPage({ signUp = false }: { signUp?: boolean }) {
  return (
    <div className="min-h-[calc(100dvh-80px)] flex flex-col items-center justify-center px-4 py-10 gap-5">
      {signUp ? (
        <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
      ) : (
        <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
      )}
      <p className="max-w-md text-center text-sm text-muted-foreground px-4">
        Free during beta. Create your account to save your pages and split tests.
      </p>
    </div>
  );
}
