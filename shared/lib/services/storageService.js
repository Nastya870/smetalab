/**
 * Centralized Storage Service
 * 
 * Provides safe, testable interface for browser storage (localStorage/sessionStorage)
 * with built-in error handling for quota exceeded and JSON parsing failures.
 * 
 * Features:
 * - QuotaExceededError handling (prevents app crashes)
 * - Safe JSON serialization/deserialization
 * - Default value support
 * - Storage type injection (testable)
 * - Consistent error handling
 * 
 * @example
 * import storageService from '@/shared/lib/services/storageService';
 * 
 * // Get with default
 * const user = storageService.get('user', null);
 * 
 * // Set (handles quota errors)
 * storageService.set('accessToken', token);
 * 
 * // Remove
 * storageService.remove('accessToken');
 */

class StorageService {
  /**
   * @param {Storage} storage - Browser storage object (localStorage/sessionStorage)
   */
  constructor(storage = typeof window !== 'undefined' ? window.localStorage : null) {
    this.storage = storage;
    this.memoryCache = new Map(); // Fallback when storage unavailable
  }

  /**
   * Check if storage is available
   * @private
   */
  _isAvailable() {
    if (!this.storage) return false;
    
    try {
      const testKey = '__storage_test__';
      this.storage.setItem(testKey, 'test');
      this.storage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get value from storage
   * @param {string} key - Storage key
   * @param {*} defaultValue - Default value if key doesn't exist or parsing fails
   * @returns {*} Parsed value or defaultValue
   */
  get(key, defaultValue = null) {
    try {
      if (!this._isAvailable()) {
        // Fallback to memory cache
        return this.memoryCache.has(key) ? this.memoryCache.get(key) : defaultValue;
      }

      const item = this.storage.getItem(key);
      
      if (item === null) {
        return defaultValue;
      }

      // Try to parse as JSON
      try {
        return JSON.parse(item);
      } catch (parseError) {
        // Not JSON or corrupted - return raw string
        console.warn(`[StorageService] Failed to parse JSON for key "${key}":`, parseError.message);
        return item;
      }
    } catch (error) {
      console.error(`[StorageService] Error reading key "${key}":`, error);
      return defaultValue;
    }
  }

  /**
   * Set value in storage
   * @param {string} key - Storage key
   * @param {*} value - Value to store (will be JSON stringified)
   * @returns {boolean} Success status
   */
  set(key, value) {
    // Handle undefined values (JSON.stringify returns undefined for undefined)
    if (value === undefined) {
      value = null;
    }

    try {
      if (!this._isAvailable()) {
        // Fallback to memory cache
        this.memoryCache.set(key, value);
        return true;
      }

      const serialized = JSON.stringify(value);
      this.storage.setItem(key, serialized);
      return true;
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.warn(`[StorageService] Storage quota exceeded for key "${key}". Using memory cache.`);
        this.memoryCache.set(key, value);
        return false;
      }

      console.error(`[StorageService] Error setting key "${key}":`, error);
      return false;
    }
  }

  /**
   * Remove value from storage
   * @param {string} key - Storage key
   * @returns {boolean} Success status
   */
  remove(key) {
    try {
      if (!this._isAvailable()) {
        this.memoryCache.delete(key);
        return true;
      }

      this.storage.removeItem(key);
      this.memoryCache.delete(key);
      return true;
    } catch (error) {
      console.error(`[StorageService] Error removing key "${key}":`, error);
      return false;
    }
  }

  /**
   * Clear all storage
   * @returns {boolean} Success status
   */
  clear() {
    try {
      if (!this._isAvailable()) {
        this.memoryCache.clear();
        return true;
      }

      this.storage.clear();
      this.memoryCache.clear();
      return true;
    } catch (error) {
      console.error('[StorageService] Error clearing storage:', error);
      return false;
    }
  }

  /**
   * Check if key exists in storage
   * @param {string} key - Storage key
   * @returns {boolean}
   */
  hasKey(key) {
    try {
      if (!this._isAvailable()) {
        return this.memoryCache.has(key);
      }

      return this.storage.getItem(key) !== null;
    } catch (error) {
      console.error(`[StorageService] Error checking key "${key}":`, error);
      return false;
    }
  }

  /**
   * Get all keys from storage
   * @returns {string[]}
   */
  getKeys() {
    try {
      if (!this._isAvailable()) {
        return Array.from(this.memoryCache.keys());
      }

      // Get all keys from storage (length property contains count)
      const keys = [];
      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i);
        if (key !== null) {
          keys.push(key);
        }
      }
      return keys;
    } catch (error) {
      console.error('[StorageService] Error getting keys:', error);
      return [];
    }
  }
}

// Create default instances
const localStorageService = new StorageService(
  typeof window !== 'undefined' ? window.localStorage : null
);

const sessionStorageService = new StorageService(
  typeof window !== 'undefined' ? window.sessionStorage : null
);

// Export default instance (localStorage) and factory
export default localStorageService;
export { StorageService, sessionStorageService };
