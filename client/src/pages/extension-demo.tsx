import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface MatchResult {
  matched: boolean;
  cardId?: string;
  score?: number;
  sponsored?: {
    title: string;
    subtitle?: string;
    cta: string;
    href: string;
    brand: string;
  };
  organic?: {
    title: string;
    subtitle?: string;
    cta: string;
    href: string;
    source: string;
  };
}

export default function ExtensionDemo() {
  const [inputValue, setInputValue] = useState('');
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastIntent, setLastIntent] = useState('');

  const extractLastWords = (text: string, count = 6): string => {
    if (!text.trim()) return '';
    const words = text.trim().split(/\s+/);
    return words.slice(-count).join(' ');
  };

  const testMatch = async (text: string) => {
    const intent = extractLastWords(text, 6);
    if (!intent) return;

    setIsLoading(true);
    setLastIntent(intent);

    try {
      const response = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: intent,
          url: window.location.href,
          ts: Date.now(),
          locale: navigator.language
        })
      });

      const result = await response.json();
      setMatchResult(result);
    } catch (error) {
      console.error('Match failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);
    if (value.length >= 10) {
      testMatch(value);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl" data-testid="page-extension-demo">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">Intent Assistant Demo</h1>
        <p className="text-muted-foreground" data-testid="text-page-description">
          Test the Intent Assistant matching engine. Type one of the seeded intents to see help cards.
        </p>
      </div>

      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Try These Intents:</h2>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {[
            'timberland boots',
            'chicken curry recipe',
            'resume template',
            'crm for small business',
            'cheap flights to miami',
            'grow my tiktok'
          ].map((intent) => (
            <Button
              key={intent}
              variant="outline"
              onClick={() => handleInputChange(intent)}
              data-testid={`button-intent-${intent.replace(/\s+/g, '-')}`}
            >
              {intent}
            </Button>
          ))}
        </div>
      </Card>

      <Card className="p-6 mb-6">
        <label className="block mb-2 font-medium">Type your intent (minimum 10 characters):</label>
        <Textarea
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="Type something like 'I need timberland boots for hiking'..."
          className="mb-2"
          rows={3}
          data-testid="input-intent-text"
        />
        <div className="text-sm text-muted-foreground">
          <span className="font-medium">Last 6 words extracted:</span>{' '}
          <span className="font-mono bg-muted px-2 py-1 rounded" data-testid="text-extracted-intent">
            {extractLastWords(inputValue, 6) || '(none)'}
          </span>
        </div>
      </Card>

      {isLoading && (
        <Card className="p-6 text-center" data-testid="card-loading">
          <div className="animate-pulse">Matching intent...</div>
        </Card>
      )}

      {matchResult && !isLoading && (
        <div data-testid="result-container">
          {matchResult.matched ? (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="default" data-testid="badge-match-found">Match Found</Badge>
                <span className="text-sm text-muted-foreground">
                  Card: {matchResult.cardId} | Score: {matchResult.score?.toFixed(2)}
                </span>
              </div>

              {matchResult.sponsored && (
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg" data-testid="card-sponsored">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-blue-600">💎 Sponsored</Badge>
                    <span className="text-xs text-muted-foreground">{matchResult.sponsored.brand}</span>
                  </div>
                  <h3 className="font-semibold text-lg mb-1" data-testid="text-sponsored-title">
                    {matchResult.sponsored.title}
                  </h3>
                  {matchResult.sponsored.subtitle && (
                    <p className="text-sm text-muted-foreground mb-3" data-testid="text-sponsored-subtitle">
                      {matchResult.sponsored.subtitle}
                    </p>
                  )}
                  <Button
                    onClick={() => window.open(matchResult.sponsored!.href, '_blank')}
                    data-testid="button-sponsored-cta"
                  >
                    {matchResult.sponsored.cta} ↗
                  </Button>
                </div>
              )}

              {matchResult.organic && (
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg" data-testid="card-organic">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">📚 Free Help</Badge>
                    <span className="text-xs text-muted-foreground">{matchResult.organic.source}</span>
                  </div>
                  <h3 className="font-semibold text-lg mb-1" data-testid="text-organic-title">
                    {matchResult.organic.title}
                  </h3>
                  {matchResult.organic.subtitle && (
                    <p className="text-sm text-muted-foreground mb-3" data-testid="text-organic-subtitle">
                      {matchResult.organic.subtitle}
                    </p>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => window.open(matchResult.organic!.href, '_blank')}
                    data-testid="button-organic-cta"
                  >
                    {matchResult.organic.cta} →
                  </Button>
                </div>
              )}
            </Card>
          ) : (
            <Card className="p-6 text-center" data-testid="card-no-match">
              <div className="text-muted-foreground">
                No match found for: <span className="font-mono">{lastIntent}</span>
              </div>
            </Card>
          )}
        </div>
      )}

      <Card className="p-6 mt-6 bg-muted">
        <h3 className="font-semibold mb-2">📝 How It Works:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
          <li>Type any text with at least 10 characters</li>
          <li>The last 6 words are extracted and sent to the API</li>
          <li>Fuzzy matching finds the best help card</li>
          <li>Sponsored and organic help cards are displayed</li>
          <li>Scores: 1.0 = exact match, 0.8 = Jaro-Winkler similarity, 0.6 = token overlap</li>
        </ol>
      </Card>
    </div>
  );
}
