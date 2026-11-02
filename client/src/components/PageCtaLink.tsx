import { isSafePageCtaHref } from "@shared/schema";

interface PageCtaLinkProps {
  text?: string;
  href?: string;
  onClick?: () => void;
}

export function PageCtaLink({ text = "", href = "", onClick }: PageCtaLinkProps) {
  const label = text.trim();
  const destination = href.trim();
  if (!label || !isSafePageCtaHref(destination)) return null;

  return (
    <a
      href={destination}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className="inline-flex min-h-12 max-w-full items-center justify-center rounded-xl bg-white px-8 py-3 text-center font-semibold text-purple-700 shadow-lg transition hover:-translate-y-0.5 hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-purple-700"
      data-testid="link-page-cta"
    >
      {label}
    </a>
  );
}
