// Background service worker for Intent Assistant Chrome Extension

// Setup context menu for category toggles
const chromeAPI = (typeof self !== 'undefined' && (self as any).chrome) as any;

if (chromeAPI?.runtime) {
  chromeAPI.runtime.onInstalled.addListener(() => {
    console.log('Intent Assistant installed');
    setupContextMenus();
  });

  chromeAPI.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
    if (message.action === 'setupContextMenu') {
      setupContextMenus();
      sendResponse({ success: true });
      return true; // Only return true when we actually send a response
    }
    // Don't return true for unhandled messages
  });
}

function setupContextMenus() {
  if (!chromeAPI?.contextMenus) return;

  try {
    chromeAPI.contextMenus.removeAll(() => {
      chromeAPI.contextMenus.create({
        id: 'intent-assistant-settings',
        title: 'Intent Assistant Settings',
        contexts: ['page', 'selection']
      });

      const categories = [
        { id: 'toggle-shopping', title: 'Toggle Shopping Ads', category: 'shopping' },
        { id: 'toggle-food', title: 'Toggle Food & Recipe Ads', category: 'food' },
        { id: 'toggle-jobs', title: 'Toggle Jobs & Career Ads', category: 'jobs' },
        { id: 'toggle-saas', title: 'Toggle SaaS & Tools Ads', category: 'saas' },
        { id: 'toggle-travel', title: 'Toggle Travel Ads', category: 'travel' },
        { id: 'toggle-creator', title: 'Toggle Creator Tools Ads', category: 'creator' }
      ];

      categories.forEach(cat => {
        chromeAPI.contextMenus.create({
          id: cat.id,
          title: cat.title,
          contexts: ['page'],
          parentId: 'intent-assistant-settings'
        });
      });
    });
  } catch (error) {
    console.error('Context menu setup failed:', error);
  }
}

// Handle context menu clicks
if (chromeAPI?.contextMenus) {
  chromeAPI.contextMenus.onClicked.addListener((info: any, tab: any) => {
    const categoryMap: { [key: string]: string } = {
      'toggle-shopping': 'shopping',
      'toggle-food': 'food',
      'toggle-jobs': 'jobs',
      'toggle-saas': 'saas',
      'toggle-travel': 'travel',
      'toggle-creator': 'creator'
    };

    const category = categoryMap[info.menuItemId];
    if (category && chromeAPI.storage) {
      chromeAPI.storage.local.get(['intent-assistant-data'], (result: any) => {
        const data = result['intent-assistant-data'] || {
          suppressedSites: [],
          enabledCategories: ['shopping', 'food', 'jobs', 'saas', 'travel', 'creator'],
          lastToastTime: 0
        };

        const index = data.enabledCategories.indexOf(category);
        if (index > -1) {
          data.enabledCategories.splice(index, 1);
        } else {
          data.enabledCategories.push(category);
        }

        chromeAPI.storage.local.set({ 'intent-assistant-data': data });
      });
    }
  });
}
