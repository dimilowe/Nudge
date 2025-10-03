import { type HelpCard } from "@shared/schema";

// Simple Jaro-Winkler implementation
function jaroWinkler(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  
  const len1 = s1.length;
  const len2 = s2.length;
  
  if (len1 === 0 || len2 === 0) return 0.0;
  
  const matchWindow = Math.floor(Math.max(len1, len2) / 2) - 1;
  const s1Matches = new Array(len1).fill(false);
  const s2Matches = new Array(len2).fill(false);
  
  let matches = 0;
  let transpositions = 0;
  
  // Identify matches
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, len2);
    
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = s2Matches[j] = true;
      matches++;
      break;
    }
  }
  
  if (matches === 0) return 0.0;
  
  // Count transpositions
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }
  
  const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;
  
  // Winkler modification
  let prefix = 0;
  for (let i = 0; i < Math.min(len1, len2, 4); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }
  
  return jaro + (0.1 * prefix * (1 - jaro));
}

// Calculate token overlap ratio
function tokenOverlap(s1: string, s2: string): number {
  const tokens1 = new Set(s1.toLowerCase().split(/\s+/).filter(t => t.length > 0));
  const tokens2 = new Set(s2.toLowerCase().split(/\s+/).filter(t => t.length > 0));
  
  if (tokens1.size === 0 || tokens2.size === 0) return 0;
  
  const tokens1Array = Array.from(tokens1);
  const tokens2Array = Array.from(tokens2);
  const intersection = new Set(tokens1Array.filter(t => tokens2.has(t)));
  const union = new Set([...tokens1Array, ...tokens2Array]);
  
  return intersection.size / union.size;
}

// Normalize text for matching
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Score a help card against user intent
function scoreHelpCard(userIntent: string, card: HelpCard): number {
  const normalizedIntent = normalizeText(userIntent);
  let bestScore = 0;
  
  for (const phrase of card.intentPhrases) {
    const normalizedPhrase = normalizeText(phrase);
    
    // Exact match gets highest score
    if (normalizedIntent.includes(normalizedPhrase) || normalizedPhrase.includes(normalizedIntent)) {
      return 1.0;
    }
    
    // Jaro-Winkler similarity
    const jaroScore = jaroWinkler(normalizedIntent, normalizedPhrase);
    if (jaroScore >= 0.82) {
      bestScore = Math.max(bestScore, 0.8);
    }
    
    // Token overlap
    const overlapScore = tokenOverlap(normalizedIntent, normalizedPhrase);
    if (overlapScore >= 0.6) {
      bestScore = Math.max(bestScore, 0.6);
    }
  }
  
  return bestScore;
}

export interface MatchResult {
  matched: boolean;
  cardId?: string;
  score?: number;
  sponsored?: any;
  organic?: any;
  variant?: "control" | "compact" | "detailed";
}

export function findBestMatch(userIntent: string, cards: HelpCard[]): MatchResult {
  if (!userIntent.trim() || cards.length === 0) {
    return { matched: false };
  }
  
  let bestCard: HelpCard | null = null;
  let bestScore = 0;
  
  for (const card of cards) {
    const score = scoreHelpCard(userIntent, card);
    if (score > bestScore) {
      bestScore = score;
      bestCard = card;
    }
  }
  
  // Minimum threshold for a valid match
  if (bestScore < 0.6 || !bestCard) {
    return { matched: false };
  }
  
  // Randomly assign A/B test variant
  const variants: Array<"control" | "compact" | "detailed"> = ["control", "compact", "detailed"];
  const variant = variants[Math.floor(Math.random() * variants.length)];
  
  return {
    matched: true,
    cardId: bestCard.id,
    score: bestScore,
    sponsored: bestCard.sponsored,
    organic: bestCard.organic,
    variant,
  };
}

// Extract last N words from text
export function extractLastWords(text: string, count = 6): string {
  if (!text.trim()) return "";
  
  const words = text.trim().split(/\s+/);
  const lastWords = words.slice(-count);
  return lastWords.join(" ");
}
