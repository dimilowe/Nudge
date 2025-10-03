import { ExtensionStorage } from './storage';
import { createToastOverlay } from './overlay';
import type { MatchRequest, MatchResult } from './types';

class IntentCapture {
  private storage: ExtensionStorage;
  private debounceTimer: number | null = null;
  private lastToastTime = 0;
  private readonly RATE_LIMIT_MS = 15000; // 15 seconds
  private readonly DEBOUNCE_MS = 500;
  private readonly API_BASE_URL = 'http://localhost:5000/api';
  
  constructor() {
    this.storage = new ExtensionStorage();
    this.init();
  }

  private async init() {
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
      // Rate limiting check
      const now = Date.now();
      if (now - this.lastToastTime < this.RATE_LIMIT_MS) {
        return;
      }

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
      
      if (matchResult.matched && (matchResult.sponsored || matchResult.organic)) {
        // Update rate limiting
        this.lastToastTime = now;
        
        // Show toast overlay
        await this.showToast(matchResult, lastWords);
      }

    } catch (error) {
      console.error('Intent processing failed:', error);
    }
  }

  private async showToast(matchResult: MatchResult, intentText: string) {
    try {
      if (!matchResult.organic) {
        console.error('Missing organic content');
        return;
      }
      
      const toastOverlay = createToastOverlay({
        sponsored: matchResult.sponsored,
        organic: matchResult.organic,
        intentText,
        cardId: matchResult.cardId,
        onClose: () => {
          toastOverlay.remove();
        },
        onSuppressSite: async () => {
          await this.storage.suppressSite(window.location.origin);
          toastOverlay.remove();
        },
        onFeedback: async (wasHelpful: boolean, clicked?: 'sponsored' | 'organic') => {
          await this.sendFeedback(matchResult.cardId!, wasHelpful, clicked);
        }
      });

      document.body.appendChild(toastOverlay);

      // Auto-dismiss after 12 seconds
      setTimeout(() => {
        if (document.body.contains(toastOverlay)) {
          toastOverlay.remove();
        }
      }, 12000);

    } catch (error) {
      console.error('Toast display failed:', error);
    }
  }

  private async sendFeedback(cardId: string, wasHelpful: boolean, clicked?: 'sponsored' | 'organic') {
    try {
      await fetch(`${this.API_BASE_URL}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
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
