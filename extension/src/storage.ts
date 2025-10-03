export type CategoryType = "shopping" | "food" | "jobs" | "saas" | "travel" | "creator";

interface StorageData {
  suppressedSites: string[];
  enabledCategories: CategoryType[];
  lastToastTime: number;
}

export class ExtensionStorage {
  private readonly STORAGE_KEY = 'intent-assistant-data';
  private readonly DEFAULT_CATEGORIES: CategoryType[] = [
    'shopping', 'food', 'jobs', 'saas', 'travel', 'creator'
  ];

  private async getStorageData(): Promise<StorageData> {
    const chromeAPI = (typeof window !== 'undefined' && (window as any).chrome) as any;
    if (chromeAPI?.storage) {
      try {
        const result = await chromeAPI.storage.local.get([this.STORAGE_KEY]);
        const data = result[this.STORAGE_KEY];
        
        return {
          suppressedSites: data?.suppressedSites || [],
          enabledCategories: data?.enabledCategories || [...this.DEFAULT_CATEGORIES],
          lastToastTime: data?.lastToastTime || 0,
        };
      } catch (error) {
        console.error('Chrome storage read failed:', error);
      }
    }
    
    // Fallback to localStorage
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      const data = stored ? JSON.parse(stored) : {};
      
      return {
        suppressedSites: data.suppressedSites || [],
        enabledCategories: data.enabledCategories || [...this.DEFAULT_CATEGORIES],
        lastToastTime: data.lastToastTime || 0,
      };
    } catch (error) {
      console.error('localStorage read failed:', error);
      return {
        suppressedSites: [],
        enabledCategories: [...this.DEFAULT_CATEGORIES],
        lastToastTime: 0,
      };
    }
  }

  private async setStorageData(data: StorageData): Promise<void> {
    const chromeAPI = (typeof window !== 'undefined' && (window as any).chrome) as any;
    if (chromeAPI?.storage) {
      try {
        await chromeAPI.storage.local.set({ [this.STORAGE_KEY]: data });
        return;
      } catch (error) {
        console.error('Chrome storage write failed:', error);
      }
    }
    
    // Fallback to localStorage
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('localStorage write failed:', error);
    }
  }

  async isSiteSuppressed(origin: string): Promise<boolean> {
    const data = await this.getStorageData();
    return data.suppressedSites.includes(origin);
  }

  async suppressSite(origin: string): Promise<void> {
    const data = await this.getStorageData();
    if (!data.suppressedSites.includes(origin)) {
      data.suppressedSites.push(origin);
      await this.setStorageData(data);
    }
  }

  async unsuppressSite(origin: string): Promise<void> {
    const data = await this.getStorageData();
    data.suppressedSites = data.suppressedSites.filter(site => site !== origin);
    await this.setStorageData(data);
  }

  async getSuppressedSites(): Promise<string[]> {
    const data = await this.getStorageData();
    return [...data.suppressedSites];
  }

  async clearAllSuppressions(): Promise<void> {
    const data = await this.getStorageData();
    data.suppressedSites = [];
    await this.setStorageData(data);
  }

  async getEnabledCategories(): Promise<CategoryType[]> {
    const data = await this.getStorageData();
    return [...data.enabledCategories];
  }

  async setCategoryEnabled(category: CategoryType, enabled: boolean): Promise<void> {
    const data = await this.getStorageData();
    
    if (enabled && !data.enabledCategories.includes(category)) {
      data.enabledCategories.push(category);
    } else if (!enabled) {
      data.enabledCategories = data.enabledCategories.filter(cat => cat !== category);
    }
    
    await this.setStorageData(data);
  }

  async isCategoryEnabled(category: CategoryType): Promise<boolean> {
    const data = await this.getStorageData();
    return data.enabledCategories.includes(category);
  }

  async updateLastToastTime(timestamp: number): Promise<void> {
    const data = await this.getStorageData();
    data.lastToastTime = timestamp;
    await this.setStorageData(data);
  }

  async getLastToastTime(): Promise<number> {
    const data = await this.getStorageData();
    return data.lastToastTime;
  }
}
