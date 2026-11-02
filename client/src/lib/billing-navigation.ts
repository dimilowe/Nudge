export function pricingSignInUrl(basePath = "") {
  return `${basePath}/sign-in?redirect_url=${encodeURIComponent(`${basePath}/pricing?checkout=success`)}`;
}

// Preserve the checkout confirmation across sign-in, without allowing an
// external URL (or an arbitrary app route) supplied through a query parameter.
export function pricingAuthReturn(search: string, basePath = "") {
  const target = new URLSearchParams(search).get("redirect_url");
  if (!target) return undefined;
  try {
    const url = new URL(target, "https://nudg.invalid");
    if (url.origin !== "https://nudg.invalid" || url.pathname !== `${basePath}/pricing`) return undefined;
    const checkout = url.searchParams.get("checkout");
    return `${basePath}/pricing${checkout === "success" || checkout === "canceled" ? `?checkout=${checkout}` : ""}`;
  } catch { return undefined; }
}
