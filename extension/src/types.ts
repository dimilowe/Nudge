export interface MatchRequest {
  text: string;
  url: string;
  ts: number;
  locale?: string;
}

export interface SponsoredContent {
  title: string;
  subtitle?: string;
  cta: string;
  href: string;
  brand: string;
}

export interface OrganicContent {
  title: string;
  subtitle?: string;
  cta: string;
  href: string;
  source: string;
}

export interface MatchResult {
  matched: boolean;
  cardId?: string;
  score?: number;
  sponsored?: SponsoredContent;
  organic?: OrganicContent;
  message?: string;
  error?: string;
  logId?: string;
}

export interface FeedbackRequest {
  cardId: string;
  wasHelpful: boolean;
  clicked?: 'sponsored' | 'organic';
}

export type CategoryType = "shopping" | "food" | "jobs" | "saas" | "travel" | "creator";
