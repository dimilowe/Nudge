import { SponsoredContent, OrganicContent } from './types';

interface ToastOptions {
  sponsored?: SponsoredContent;
  organic: OrganicContent;
  intentText: string;
  cardId?: string;
  onClose: () => void;
  onSuppressSite: () => void;
  onFeedback: (wasHelpful: boolean, clicked?: 'sponsored' | 'organic') => void;
}

export function createToastOverlay(options: ToastOptions): HTMLElement {
  // Create shadow DOM container
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 999999;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    pointer-events: auto;
  `;

  const shadowRoot = container.attachShadow({ mode: 'closed' });
  
  // Create styles
  const style = document.createElement('style');
  style.textContent = `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    .toast-card {
      width: 360px;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 
        0 1px 3px rgba(0, 0, 0, 0.05),
        0 10px 25px -5px rgba(0, 0, 0, 0.1),
        0 20px 40px -10px rgba(0, 0, 0, 0.08);
      animation: fadeIn 0.3s ease-in-out;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      font-size: 14px;
      line-height: 1.5;
    }
    
    .toast-card:hover {
      transform: translateY(-2px);
      box-shadow: 
        0 2px 4px rgba(0, 0, 0, 0.06),
        0 15px 30px -5px rgba(0, 0, 0, 0.12),
        0 25px 50px -10px rgba(0, 0, 0, 0.1);
    }
    
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .toast-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: 16px;
      border-bottom: 1px solid hsl(210, 20%, 90%);
    }
    
    .toast-header-content {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      flex: 1;
    }
    
    .toast-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: hsl(217, 91%, 95%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: hsl(217, 91%, 60%);
      font-size: 16px;
    }
    
    .toast-title {
      font-weight: 600;
      font-size: 14px;
      color: hsl(210, 10%, 23%);
      margin-bottom: 2px;
    }
    
    .toast-subtitle {
      font-size: 12px;
      color: hsl(210, 10%, 45%);
    }
    
    .close-btn {
      background: none;
      border: none;
      color: hsl(210, 10%, 45%);
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      transition: color 0.2s;
    }
    
    .close-btn:hover {
      color: hsl(210, 10%, 23%);
    }
    
    .sponsored-section {
      padding: 16px;
      background: hsl(217, 91%, 95%);
      background: linear-gradient(135deg, hsl(217, 91%, 95%) 0%, hsl(217, 91%, 97%) 100%);
    }
    
    .organic-section {
      padding: 16px;
      border-top: 1px solid hsl(210, 20%, 90%);
    }
    
    .section-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
      margin-bottom: 8px;
    }
    
    .sponsored-badge {
      background: hsl(217, 91%, 60%);
      background: linear-gradient(135deg, hsl(217, 91%, 60%) 0%, hsl(217, 91%, 70%) 100%);
      color: white;
      border: 1px solid hsl(217, 91%, 60%);
    }
    
    .organic-badge {
      background: hsl(210, 20%, 96%);
      color: hsl(210, 10%, 45%);
      border: 1px solid hsl(210, 20%, 90%);
    }
    
    .section-title {
      font-weight: 600;
      font-size: 14px;
      color: hsl(210, 10%, 23%);
      margin-bottom: 4px;
    }
    
    .section-description {
      font-size: 12px;
      color: hsl(210, 10%, 45%);
      margin-bottom: 12px;
    }
    
    .cta-btn {
      width: 100%;
      border: none;
      border-radius: 8px;
      padding: 8px 16px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    
    .sponsored-btn {
      background: hsl(217, 91%, 60%);
      color: white;
    }
    
    .sponsored-btn:hover {
      background: hsl(217, 91%, 55%);
      transform: translateY(-1px);
    }
    
    .organic-btn {
      background: hsl(210, 15%, 40%);
      color: white;
    }
    
    .organic-btn:hover {
      background: hsl(210, 15%, 35%);
      transform: translateY(-1px);
    }
    
    .section-source {
      font-size: 11px;
      color: hsl(210, 10%, 45%);
      margin-top: 8px;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    
    .toast-footer {
      padding: 12px 16px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 12px;
    }
    
    .suppress-btn {
      background: none;
      border: none;
      color: hsl(210, 10%, 45%);
      cursor: pointer;
      text-decoration: none;
      font-size: 11px;
      transition: color 0.2s;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    
    .suppress-btn:hover {
      color: hsl(210, 10%, 23%);
    }
    
    .feedback-buttons {
      display: flex;
      gap: 8px;
    }
    
    .feedback-btn {
      background: none;
      border: none;
      color: hsl(210, 10%, 45%);
      cursor: pointer;
      padding: 2px;
      transition: color 0.2s;
    }
    
    .feedback-btn:hover {
      color: hsl(210, 10%, 23%);
    }
    
    .progress-bar {
      height: 4px;
      background: hsl(210, 20%, 96%);
      border-radius: 0 0 12px 12px;
      overflow: hidden;
    }
    
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, hsl(217, 91%, 60%) 0%, hsl(217, 91%, 70%) 100%);
      width: 100%;
      animation: progress 12s linear forwards;
    }
    
    @keyframes progress {
      from { width: 100%; }
      to { width: 0%; }
    }
    
    .debug-badge {
      position: absolute;
      top: -8px;
      right: 8px;
      background: hsl(0, 84%, 60%);
      color: white;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
      animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
  `;

  shadowRoot.appendChild(style);

  // Create toast HTML
  const toast = document.createElement('div');
  toast.className = 'toast-card';
  
  // Append toast to shadow root first to ensure it's in DOM tree
  shadowRoot.appendChild(toast);
  
  let html = `
    <div class="toast-header">
      <div class="toast-header-content">
        <div class="toast-icon">✨</div>
        <div>
          <div class="toast-title">Help Found</div>
          <div class="toast-subtitle">Based on: "${options.intentText}"</div>
        </div>
      </div>
      <button class="close-btn" data-action="close">✕</button>
    </div>
  `;

  // Sponsored section
  if (options.sponsored) {
    html += `
      <div class="sponsored-section">
        <div class="section-badge sponsored-badge">
          💎 Sponsored
        </div>
        <div class="section-title">${options.sponsored.title}</div>
        ${options.sponsored.subtitle ? `<div class="section-description">${options.sponsored.subtitle}</div>` : ''}
        <button class="cta-btn sponsored-btn" data-action="sponsored-click">
          ${options.sponsored.cta}
          <span>↗</span>
        </button>
        <div class="section-source">
          🏪 ${options.sponsored.brand}
        </div>
      </div>
    `;
  }

  // Organic section
  html += `
    <div class="organic-section">
      <div class="section-badge organic-badge">
        📚 Free Help
      </div>
      <div class="section-title">${options.organic.title}</div>
      ${options.organic.subtitle ? `<div class="section-description">${options.organic.subtitle}</div>` : ''}
      <button class="cta-btn organic-btn" data-action="organic-click">
        ${options.organic.cta}
        <span>→</span>
      </button>
      <div class="section-source">
        🔗 ${options.organic.source}
      </div>
    </div>
  `;

  // Footer
  html += `
    <div class="toast-footer">
      <button class="suppress-btn" data-action="suppress">
        🚫 Don't show on this site
      </button>
      <div class="feedback-buttons">
        <button class="feedback-btn" data-action="thumbs-up" title="Helpful">👍</button>
        <button class="feedback-btn" data-action="thumbs-down" title="Not helpful">👎</button>
      </div>
    </div>
    <div class="progress-bar">
      <div class="progress-fill"></div>
    </div>
  `;

  toast.innerHTML = html;

  // Add event listeners
  toast.addEventListener('click', (e) => {
    e.stopPropagation();
    const target = e.target as HTMLElement;
    const action = target.getAttribute('data-action');

    switch (action) {
      case 'close':
        options.onClose();
        break;
        
      case 'sponsored-click':
        if (options.sponsored) {
          options.onFeedback(true, 'sponsored');
          window.open(options.sponsored.href, '_blank');
          options.onClose();
        }
        break;
        
      case 'organic-click':
        options.onFeedback(true, 'organic');
        window.open(options.organic.href, '_blank');
        options.onClose();
        break;
        
      case 'suppress':
        options.onSuppressSite();
        break;
        
      case 'thumbs-up':
        options.onFeedback(true);
        target.style.color = 'hsl(217, 91%, 60%)';
        break;
        
      case 'thumbs-down':
        options.onFeedback(false);
        target.style.color = 'hsl(0, 84%, 60%)';
        break;
    }
  });

  // Prevent auto-dismiss on hover
  let hovered = false;
  toast.addEventListener('mouseenter', () => {
    hovered = true;
    const progressFill = toast.querySelector('.progress-fill') as HTMLElement;
    if (progressFill) {
      progressFill.style.animationPlayState = 'paused';
    }
  });

  toast.addEventListener('mouseleave', () => {
    hovered = false;
    const progressFill = toast.querySelector('.progress-fill') as HTMLElement;
    if (progressFill) {
      progressFill.style.animationPlayState = 'running';
    }
  });

  return container;
}
