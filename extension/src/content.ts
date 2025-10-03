import { ExtensionStorage } from './storage';
import { createPersistentPanel } from './overlay';
import type { MatchRequest, MatchResult } from './types';

class IntentCapture {
  private storage: ExtensionStorage;
  private debounceTimer: number | null = null;
  private readonly DEBOUNCE_MS = 500;
  private readonly API_BASE_URL = 'https://ea5b6803-344d-47e5-8427-a61029737083-00-27nkosr42ci4h.janeway.replit.dev/api';
  private panel: ReturnType<typeof createPersistentPanel> | null = null;
  private currentLogId: string | null = null;
  
  constructor() {
    this.storage = new ExtensionStorage();
    this.init();
  }

  private async init() {
    // Create persistent panel once
    this.panel = createPersistentPanel();
    document.body.appendChild(this.panel.container);
    
    // Add event listeners for input capture
    document.addEventListener('input', this.handleInput.bind(this));
    document.addEventListener('keyup', this.handleKeyup.bind(this));
    
    // Add context menu for category toggles
    await this.setupContextMenu();
  }

  private async setupContextMenu() {
    if (typeof window !== 'undefined' && (window as any).chrome?.runtime) {
      try {
        (window as any).chrome.runtime.sendMessage({ action: 'setupContextMenu' });
      } catch (error) {
        console.debug('Context menu setup failed:', error);
      }
    }
  }

  private handleInput(event: Event) {
    this.handleTextInput(event);
  }

  private handleKeyup(event: KeyboardEvent) {
    this.handleTextInput(event);
  }

  private async handleTextInput(event: Event) {
    const target = event.target as HTMLElement;
    
    // Only capture from text inputs and textareas
    if (!this.isTextInput(target)) return;
    
    // Skip password fields
    if (target instanceof HTMLInputElement && target.type === 'password') {
      return;
    }
    
    const text = this.getInputValue(target);
    if (!text || text.length < 10) return; // Minimum text length

    // Clear previous debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Debounce the intent capture
    this.debounceTimer = window.setTimeout(() => {
      this.processIntent(text);
    }, this.DEBOUNCE_MS);
  }

  private isTextInput(element: HTMLElement): boolean {
    if (element instanceof HTMLTextAreaElement) return true;
    if (element instanceof HTMLInputElement) {
      const textTypes = ['text', 'search', 'url', 'email'];
      return textTypes.includes(element.type);
    }
    return element.isContentEditable;
  }

  private getInputValue(element: HTMLElement): string {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      return element.value;
    }
    if (element.isContentEditable) {
      return element.textContent || '';
    }
    return '';
  }

  private async processIntent(fullText: string) {
    try {
      // Check if site is suppressed
      const currentOrigin = window.location.origin;
      const isSupressed = await this.storage.isSiteSuppressed(currentOrigin);
      if (isSupressed) return;

      // Extract last 6 words
      const words = fullText.trim().split(/\s+/);
      const lastWords = words.slice(-6).join(' ');
      if (!lastWords.trim()) return;

      // Check category preferences
      const enabledCategories = await this.storage.getEnabledCategories();
      if (enabledCategories.length === 0) return;

      // Make API request
      const now = Date.now();
      const matchRequest: MatchRequest = {
        text: lastWords,
        url: window.location.href,
        ts: now,
        locale: navigator.language || 'en-US'
      };

      const response = await fetch(`${this.API_BASE_URL}/match`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(matchRequest)
      });

      if (!response.ok) {
        console.error('Match API failed:', response.statusText);
        return;
      }

      const matchResult: MatchResult = await response.json();
      
      // Store logId for feedback
      if (matchResult.logId) {
        this.currentLogId = matchResult.logId;
      }
      
      if (matchResult.matched && (matchResult.sponsored || matchResult.organic)) {
        // Show suggestions in persistent panel
        await this.showSuggestions(matchResult, lastWords);
      }

    } catch (error) {
      console.error('Intent processing failed:', error);
    }
  }

  private async showSuggestions(matchResult: MatchResult, intentText: string) {
    try {
      if (!matchResult.organic || !this.panel) {
        console.error('Missing organic content or panel not initialized');
        return;
      }
      
      this.panel.showSuggestions({
        sponsored: matchResult.sponsored,
        organic: matchResult.organic,
        intentText,
        cardId: matchResult.cardId,
        onClose: () => {
          this.panel?.hideSuggestions();
        },
        onSuppressSite: async () => {
          await this.storage.suppressSite(window.location.origin);
          this.panel?.hideSuggestions();
        },
        onFeedback: async (wasHelpful: boolean, clicked?: 'sponsored' | 'organic') => {
          await this.sendFeedback(matchResult.cardId!, wasHelpful, clicked);
        }
      });

    } catch (error) {
      console.error('Panel display failed:', error);
    }
  }

  private async sendFeedback(cardId: string, wasHelpful: boolean, clicked?: 'sponsored' | 'organic') {
    try {
      if (!this.currentLogId) {
        console.error('No logId available for feedback');
        return;
      }
      
      await fetch(`${this.API_BASE_URL}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logId: this.currentLogId,
          cardId,
          wasHelpful,
          clicked
        })
      });
    } catch (error) {
      console.error('Feedback failed:', error);
    }
  }
}

// Initialize on page load
if (typeof window !== 'undefined' && document.readyState !== 'loading') {
  new IntentCapture();
} else {
  document.addEventListener('DOMContentLoaded', () => {
    new IntentCapture();
  });
}
