import { SponsoredContent, OrganicContent } from './types';

interface PanelOptions {
  sponsored?: SponsoredContent;
  organic: OrganicContent;
  intentText: string;
  cardId?: string;
  onClose: () => void;
  onSuppressSite: () => void;
  onFeedback: (wasHelpful: boolean, clicked?: 'sponsored' | 'organic') => void;
}

interface PanelState {
  isCollapsed: boolean;
  position: { x: number; y: number };
  isDragging: boolean;
  dragOffset: { x: number; y: number };
  currentSuggestions: PanelOptions | null;
}

export function createPersistentPanel(): {
  container: HTMLElement;
  showSuggestions: (options: PanelOptions) => void;
  hideSuggestions: () => void;
} {
  // State management
  const state: PanelState = {
    isCollapsed: true,
    position: { x: window.innerWidth - 324, y: window.innerHeight - 424 }, // Default bottom-right
    isDragging: false,
    dragOffset: { x: 0, y: 0 },
    currentSuggestions: null,
  };

  // Load saved position from storage
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    chrome.storage.local.get(['panelPosition'], (result) => {
      if (result.panelPosition) {
        state.position = result.panelPosition;
        updatePanelPosition();
      }
    });
  }

  // Create shadow DOM container
  const container = document.createElement('div');
  container.id = 'intent-assistant-panel';
  container.style.cssText = `
    position: fixed;
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    pointer-events: none;
  `;

  const shadowRoot = container.attachShadow({ mode: 'closed' });
  
  // Create styles with glass-morphism
  const style = document.createElement('style');
  style.textContent = `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    .panel-wrapper {
      position: absolute;
      pointer-events: auto;
      transition: width 250ms cubic-bezier(0.4, 0, 0.2, 1),
                  height 250ms cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .panel-wrapper.collapsed {
      width: 48px;
      height: 48px;
    }
    
    .panel-wrapper.expanded {
      width: 300px;
      height: 400px;
    }
    
    .panel {
      width: 100%;
      height: 100%;
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(24px) saturate(180%);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 12px;
      box-shadow: 
        0 8px 32px rgba(0, 0, 0, 0.12),
        0 2px 8px rgba(0, 0, 0, 0.08);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: slideInRight 300ms ease-out;
    }
    
    @keyframes slideInRight {
      from {
        opacity: 0;
        transform: translateX(20px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
    
    .panel-header {
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 12px;
      cursor: move;
      user-select: none;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(255, 255, 255, 0.05);
    }
    
    .panel-header:active {
      cursor: grabbing;
    }
    
    .header-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .collapse-btn {
      background: none;
      border: none;
      color: rgba(0, 0, 0, 0.7);
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 150ms ease;
      border-radius: 4px;
    }
    
    .collapse-btn:hover {
      background: rgba(0, 0, 0, 0.05);
      color: rgba(0, 0, 0, 0.9);
    }
    
    .collapse-icon {
      width: 16px;
      height: 16px;
      transition: transform 250ms cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .collapsed .collapse-icon {
      transform: rotate(-90deg);
    }
    
    .panel-title {
      font-size: 14px;
      font-weight: 500;
      color: rgba(0, 0, 0, 0.8);
      opacity: 1;
      transition: opacity 150ms ease;
    }
    
    .collapsed .panel-title {
      opacity: 0;
    }
    
    .close-btn {
      background: none;
      border: none;
      color: rgba(0, 0, 0, 0.5);
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      transition: all 150ms ease;
      opacity: 1;
    }
    
    .close-btn:hover {
      background: rgba(0, 0, 0, 0.05);
      color: rgba(0, 0, 0, 0.9);
    }
    
    .collapsed .close-btn {
      opacity: 0;
      pointer-events: none;
    }
    
    .panel-content {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 12px;
      opacity: 1;
      transition: opacity 150ms ease;
    }
    
    .collapsed .panel-content {
      opacity: 0;
      pointer-events: none;
    }
    
    .panel-content::-webkit-scrollbar {
      width: 6px;
    }
    
    .panel-content::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
    }
    
    .panel-content::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 3px;
    }
    
    .panel-content::-webkit-scrollbar-thumb:hover {
      background: rgba(0, 0, 0, 0.3);
    }
    
    .suggestions-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .suggestion-card {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      padding: 12px;
      transition: all 150ms ease;
      animation: fadeInCard 300ms ease-out;
    }
    
    .suggestion-card:hover {
      transform: scale(1.01);
      background: rgba(255, 255, 255, 0.08);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
    }
    
    @keyframes fadeInCard {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .card-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: 500;
      margin-bottom: 8px;
    }
    
    .sponsored-badge {
      background: linear-gradient(135deg, hsl(280, 65%, 60%), hsl(280, 65%, 70%));
      color: white;
    }
    
    .organic-badge {
      background: rgba(0, 0, 0, 0.1);
      color: rgba(0, 0, 0, 0.7);
      border: 1px solid rgba(0, 0, 0, 0.15);
    }
    
    .card-title {
      font-size: 13px;
      font-weight: 500;
      color: rgba(0, 0, 0, 0.9);
      margin-bottom: 4px;
      line-height: 1.3;
    }
    
    .card-description {
      font-size: 12px;
      color: rgba(0, 0, 0, 0.6);
      line-height: 1.4;
      margin-bottom: 10px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    
    .card-cta {
      width: 100%;
      border: none;
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 150ms ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    
    .sponsored-cta {
      background: hsl(220, 90%, 56%);
      color: white;
    }
    
    .sponsored-cta:hover {
      background: hsl(220, 90%, 50%);
      transform: translateY(-1px);
    }
    
    .organic-cta {
      background: rgba(0, 0, 0, 0.7);
      color: white;
    }
    
    .organic-cta:hover {
      background: rgba(0, 0, 0, 0.85);
      transform: translateY(-1px);
    }
    
    .card-source {
      font-size: 11px;
      color: rgba(0, 0, 0, 0.5);
      margin-top: 6px;
    }
    
    .divider {
      height: 1px;
      background: rgba(0, 0, 0, 0.1);
      margin: 12px 0;
    }
    
    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: rgba(0, 0, 0, 0.4);
      font-size: 12px;
    }
    
    .empty-icon {
      font-size: 32px;
      margin-bottom: 8px;
    }
    
    .panel-footer {
      padding: 8px 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(255, 255, 255, 0.05);
      opacity: 1;
      transition: opacity 150ms ease;
    }
    
    .collapsed .panel-footer {
      opacity: 0;
      pointer-events: none;
    }
    
    .suppress-btn {
      background: none;
      border: none;
      color: rgba(0, 0, 0, 0.5);
      cursor: pointer;
      font-size: 11px;
      transition: color 150ms ease;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    
    .suppress-btn:hover {
      color: rgba(0, 0, 0, 0.8);
    }
    
    .feedback-buttons {
      display: flex;
      gap: 8px;
    }
    
    .feedback-btn {
      background: none;
      border: none;
      color: rgba(0, 0, 0, 0.5);
      cursor: pointer;
      padding: 2px;
      transition: color 150ms ease;
      font-size: 14px;
    }
    
    .feedback-btn:hover {
      color: rgba(0, 0, 0, 0.8);
    }
    
    .intent-text {
      font-size: 11px;
      color: rgba(0, 0, 0, 0.4);
      padding: 0 12px 8px;
      font-style: italic;
    }
  `;

  shadowRoot.appendChild(style);

  // Create panel HTML
  const panelWrapper = document.createElement('div');
  panelWrapper.className = 'panel-wrapper collapsed';
  
  const panel = document.createElement('div');
  panel.className = 'panel';
  
  panel.innerHTML = `
    <div class="panel-header" data-draggable="true">
      <div class="header-left">
        <button class="collapse-btn" data-action="toggle-collapse">
          <svg class="collapse-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 4L10 8L6 12"/>
          </svg>
        </button>
        <span class="panel-title">Suggestions</span>
      </div>
      <button class="close-btn" data-action="close">✕</button>
    </div>
    <div class="panel-content">
      <div class="suggestions-container">
        <div class="empty-state">
          <div class="empty-icon">💡</div>
          <div>Start typing to see suggestions</div>
        </div>
      </div>
    </div>
    <div class="panel-footer">
      <button class="suppress-btn" data-action="suppress">
        🚫 Hide on this site
      </button>
      <div class="feedback-buttons">
        <button class="feedback-btn" data-action="thumbs-up" title="Helpful">👍</button>
        <button class="feedback-btn" data-action="thumbs-down" title="Not helpful">👎</button>
      </div>
    </div>
  `;

  panelWrapper.appendChild(panel);
  shadowRoot.appendChild(panelWrapper);

  // Update panel position
  function updatePanelPosition() {
    panelWrapper.style.left = `${state.position.x}px`;
    panelWrapper.style.top = `${state.position.y}px`;
  }
  updatePanelPosition();

  // Drag functionality
  const header = panel.querySelector('[data-draggable="true"]') as HTMLElement;
  
  header.addEventListener('mousedown', (e) => {
    if ((e.target as HTMLElement).hasAttribute('data-action')) return;
    
    state.isDragging = true;
    state.dragOffset = {
      x: e.clientX - state.position.x,
      y: e.clientY - state.position.y,
    };
    header.style.cursor = 'grabbing';
  });

  document.addEventListener('mousemove', (e) => {
    if (!state.isDragging) return;
    
    state.position = {
      x: e.clientX - state.dragOffset.x,
      y: e.clientY - state.dragOffset.y,
    };
    
    // Constrain to viewport
    state.position.x = Math.max(0, Math.min(state.position.x, window.innerWidth - (state.isCollapsed ? 48 : 300)));
    state.position.y = Math.max(0, Math.min(state.position.y, window.innerHeight - (state.isCollapsed ? 48 : 400)));
    
    updatePanelPosition();
  });

  document.addEventListener('mouseup', () => {
    if (state.isDragging) {
      state.isDragging = false;
      header.style.cursor = 'move';
      
      // Save position
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        chrome.storage.local.set({ panelPosition: state.position });
      }
    }
  });

  // Event handlers
  panel.addEventListener('click', (e) => {
    e.stopPropagation();
    const target = e.target as HTMLElement;
    const action = target.getAttribute('data-action');

    switch (action) {
      case 'toggle-collapse':
        state.isCollapsed = !state.isCollapsed;
        panelWrapper.classList.toggle('collapsed', state.isCollapsed);
        break;
        
      case 'close':
        hideSuggestions();
        break;
        
      case 'sponsored-click':
        if (state.currentSuggestions?.sponsored) {
          state.currentSuggestions.onFeedback(true, 'sponsored');
          window.open(state.currentSuggestions.sponsored.href, '_blank');
        }
        break;
        
      case 'organic-click':
        if (state.currentSuggestions) {
          state.currentSuggestions.onFeedback(true, 'organic');
          window.open(state.currentSuggestions.organic.href, '_blank');
        }
        break;
        
      case 'suppress':
        if (state.currentSuggestions) {
          state.currentSuggestions.onSuppressSite();
        }
        break;
        
      case 'thumbs-up':
        if (state.currentSuggestions) {
          state.currentSuggestions.onFeedback(true);
          target.style.color = 'hsl(220, 90%, 56%)';
        }
        break;
        
      case 'thumbs-down':
        if (state.currentSuggestions) {
          state.currentSuggestions.onFeedback(false);
          target.style.color = 'hsl(0, 84%, 60%)';
        }
        break;
    }
  });

  // Public API
  function showSuggestions(options: PanelOptions) {
    state.currentSuggestions = options;
    
    const suggestionsContainer = panel.querySelector('.suggestions-container') as HTMLElement;
    let html = '';
    
    // Add intent text
    html = `<div class="intent-text">Based on: "${options.intentText}"</div>`;
    
    // Sponsored card
    if (options.sponsored) {
      html += `
        <div class="suggestion-card">
          <div class="card-badge sponsored-badge">💎 Sponsored</div>
          <div class="card-title">${options.sponsored.title}</div>
          ${options.sponsored.subtitle ? `<div class="card-description">${options.sponsored.subtitle}</div>` : ''}
          <button class="card-cta sponsored-cta" data-action="sponsored-click">
            ${options.sponsored.cta}
            <span>↗</span>
          </button>
          <div class="card-source">🏪 ${options.sponsored.brand}</div>
        </div>
      `;
    }
    
    // Divider if both exist
    if (options.sponsored) {
      html += '<div class="divider"></div>';
    }
    
    // Organic card
    html += `
      <div class="suggestion-card">
        <div class="card-badge organic-badge">📚 Free Resource</div>
        <div class="card-title">${options.organic.title}</div>
        ${options.organic.subtitle ? `<div class="card-description">${options.organic.subtitle}</div>` : ''}
        <button class="card-cta organic-cta" data-action="organic-click">
          ${options.organic.cta}
          <span>→</span>
        </button>
        <div class="card-source">🔗 ${options.organic.source}</div>
      </div>
    `;
    
    suggestionsContainer.innerHTML = html;
    
    // Auto-expand panel
    state.isCollapsed = false;
    panelWrapper.classList.remove('collapsed');
  }

  function hideSuggestions() {
    state.currentSuggestions = null;
    const suggestionsContainer = panel.querySelector('.suggestions-container') as HTMLElement;
    suggestionsContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">💡</div>
        <div>Start typing to see suggestions</div>
      </div>
    `;
    
    // Auto-collapse panel
    state.isCollapsed = true;
    panelWrapper.classList.add('collapsed');
  }

  return { container, showSuggestions, hideSuggestions };
}
