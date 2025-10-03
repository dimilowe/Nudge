import { ExtensionStorage, CategoryType } from '../src/storage';

class PopupController {
  private storage: ExtensionStorage;

  constructor() {
    this.storage = new ExtensionStorage();
    this.init();
  }

  private async init() {
    await this.renderCategories();
    await this.renderSuppressedSites();
    this.setupEventListeners();
  }

  private async renderCategories() {
    const categoriesList = document.getElementById('categories-list');
    if (!categoriesList) return;

    const categories: { id: CategoryType; name: string; icon: string; description: string }[] = [
      { id: 'shopping', name: 'Shopping', icon: '🛍️', description: 'Product recommendations' },
      { id: 'food', name: 'Food & Recipes', icon: '🍽️', description: 'Cooking help' },
      { id: 'jobs', name: 'Jobs & Career', icon: '💼', description: 'Resume & interview help' },
      { id: 'saas', name: 'SaaS & Tools', icon: '💻', description: 'Business software' },
      { id: 'travel', name: 'Travel', icon: '✈️', description: 'Flight & hotel deals' },
      { id: 'creator', name: 'Creator Tools', icon: '🎬', description: 'Growth & analytics' }
    ];

    const enabledCategories = await this.storage.getEnabledCategories();

    categoriesList.innerHTML = categories.map(category => `
      <label class="category-item">
        <input 
          type="checkbox" 
          data-category="${category.id}"
          ${enabledCategories.includes(category.id) ? 'checked' : ''}
        />
        <div class="category-content">
          <div class="category-icon">${category.icon}</div>
          <div class="category-info">
            <div class="category-name">${category.name}</div>
            <div class="category-description">${category.description}</div>
          </div>
        </div>
      </label>
    `).join('');
  }

  private async renderSuppressedSites() {
    const suppressedSitesContainer = document.getElementById('suppressed-sites');
    if (!suppressedSitesContainer) return;

    const sites = await this.storage.getSuppressedSites();

    if (sites.length === 0) {
      suppressedSitesContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🌐</div>
          <div class="empty-text">No suppressed sites</div>
        </div>
      `;
      return;
    }

    suppressedSitesContainer.innerHTML = sites.map(site => `
      <div class="suppressed-site">
        <div class="site-info">
          <div class="site-icon">🌐</div>
          <div class="site-name">${site}</div>
        </div>
        <button class="remove-site-btn" data-site="${site}">🗑️</button>
      </div>
    `).join('');
  }

  private setupEventListeners() {
    // Category toggles
    document.addEventListener('change', async (e) => {
      const target = e.target as HTMLInputElement;
      if (target.type === 'checkbox' && target.dataset.category) {
        const category = target.dataset.category as CategoryType;
        await this.storage.setCategoryEnabled(category, target.checked);
      }
    });

    // Remove suppressed site
    document.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement;
      
      if (target.classList.contains('remove-site-btn') && target.dataset.site) {
        await this.storage.unsuppressSite(target.dataset.site);
        await this.renderSuppressedSites();
      }
    });

    // Clear all suppressions
    const clearBtn = document.getElementById('clear-suppressions');
    if (clearBtn) {
      clearBtn.addEventListener('click', async () => {
        await this.storage.clearAllSuppressions();
        await this.renderSuppressedSites();
      });
    }
  }
}

// Initialize popup when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new PopupController();
  });
} else {
  new PopupController();
}
