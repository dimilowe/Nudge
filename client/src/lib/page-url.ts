export function getPublicPagePath(slug: string): string {
  return `/${encodeURIComponent(slug)}`;
}

export function getPublicPageUrl(slug: string, origin: string): string {
  return new URL(getPublicPagePath(slug), origin).toString();
}
