import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StorageService } from '../../../shared/lib/services/storageService.js';

describe('StorageService', () => {
  let mockStorage;
  let storageService;

  beforeEach(() => {
    // Create mock storage that behaves like real localStorage
    const internalStore = {};
    
    mockStorage = {
      getItem: vi.fn((key) => internalStore[key] || null),
      setItem: vi.fn((key, value) => {
        internalStore[key] = value;
      }),
      removeItem: vi.fn((key) => {
        delete internalStore[key];
      }),
      clear: vi.fn(() => {
        Object.keys(internalStore).forEach(key => delete internalStore[key]);
      }),
      get length() {
        return Object.keys(internalStore).length;
      },
      key: vi.fn((index) => {
        const keys = Object.keys(internalStore);
        return keys[index] || null;
      }),
      // For test access only (not part of Storage interface)
      _getStore: () => internalStore
    };

    storageService = new StorageService(mockStorage);
  });

  describe('set() and get()', () => {
    it('should store and retrieve string values', () => {
      storageService.set('testKey', 'testValue');
      expect(storageService.get('testKey')).toBe('testValue');
    });

    it('should store and retrieve object values', () => {
      const testObj = { name: 'Test', age: 25 };
      storageService.set('user', testObj);
      expect(storageService.get('user')).toEqual(testObj);
    });

    it('should store and retrieve array values', () => {
      const testArray = [1, 2, 3, 'test'];
      storageService.set('items', testArray);
      expect(storageService.get('items')).toEqual(testArray);
    });

    it('should store and retrieve boolean values', () => {
      storageService.set('isEnabled', true);
      expect(storageService.get('isEnabled')).toBe(true);
    });

    it('should store and retrieve number values', () => {
      storageService.set('count', 42);
      expect(storageService.get('count')).toBe(42);
    });

    it('should store and retrieve null values', () => {
      storageService.set('nullValue', null);
      expect(storageService.get('nullValue')).toBe(null);
    });
  });

  describe('get() with default values', () => {
    it('should return default value when key does not exist', () => {
      expect(storageService.get('nonExistent', 'default')).toBe('default');
    });

    it('should return null as default when key does not exist and no default provided', () => {
      expect(storageService.get('nonExistent')).toBe(null);
    });

    it('should return stored value even if default is provided', () => {
      storageService.set('existing', 'value');
      expect(storageService.get('existing', 'default')).toBe('value');
    });
  });

  describe('remove()', () => {
    it('should remove existing key', () => {
      storageService.set('toRemove', 'value');
      expect(storageService.hasKey('toRemove')).toBe(true);
      
      storageService.remove('toRemove');
      expect(storageService.hasKey('toRemove')).toBe(false);
    });

    it('should not throw when removing non-existent key', () => {
      expect(() => storageService.remove('nonExistent')).not.toThrow();
    });
  });

  describe('clear()', () => {
    it('should clear all stored values', () => {
      storageService.set('key1', 'value1');
      storageService.set('key2', 'value2');
      storageService.set('key3', 'value3');
      
      storageService.clear();
      
      expect(storageService.get('key1')).toBe(null);
      expect(storageService.get('key2')).toBe(null);
      expect(storageService.get('key3')).toBe(null);
    });
  });

  describe('hasKey()', () => {
    it('should return true for existing keys', () => {
      storageService.set('existing', 'value');
      expect(storageService.hasKey('existing')).toBe(true);
    });

    it('should return false for non-existent keys', () => {
      expect(storageService.hasKey('nonExistent')).toBe(false);
    });
  });

  describe('getKeys()', () => {
    it('should return all stored keys', () => {
      storageService.set('key1', 'value1');
      storageService.set('key2', 'value2');
      
      const keys = storageService.getKeys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
    });

    it('should return empty array when storage is empty', () => {
      const keys = storageService.getKeys();
      expect(keys).toEqual([]);
    });
  });

  describe('Error handling - Corrupted JSON', () => {
    it('should return raw string when JSON parsing fails', () => {
      // Directly set corrupted JSON in mock storage
      const internalStore = mockStorage._getStore();
      internalStore['corrupted'] = '{invalid json}';
      
      const result = storageService.get('corrupted');
      expect(result).toBe('{invalid json}');
    });

    it('should return default value when specified and JSON parsing fails', () => {
      const internalStore = mockStorage._getStore();
      internalStore['corrupted'] = '{invalid json}';
      
      const result = storageService.get('corrupted', 'fallback');
      // Should return raw string, not fallback (only returns fallback if key missing)
      expect(result).toBe('{invalid json}');
    });
  });

  describe('Error handling - QuotaExceededError', () => {
    it('should fallback to memory cache when quota exceeded', () => {
      // Mock setItem to throw QuotaExceededError
      const internalStore = mockStorage._getStore();
      mockStorage.setItem.mockImplementation((key, value) => {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      });

      // Even if storage fails, data should be accessible via memory cache
      storageService.set('large', 'value');
      
      // Should still be able to retrieve from memory cache
      expect(storageService.get('large')).toBe('value');
      
      // Verify it's using memory cache, not storage
      expect(internalStore['large']).toBeUndefined();
    });
  });

  describe('Error handling - Storage unavailable', () => {
    it('should use memory cache when storage is null', () => {
      const noStorageService = new StorageService(null);
      
      noStorageService.set('key', 'value');
      expect(noStorageService.get('key')).toBe('value');
      
      noStorageService.remove('key');
      expect(noStorageService.get('key')).toBe(null);
    });

    it('should handle clear() when storage is unavailable', () => {
      const noStorageService = new StorageService(null);
      
      noStorageService.set('key1', 'value1');
      noStorageService.set('key2', 'value2');
      
      noStorageService.clear();
      
      expect(noStorageService.get('key1')).toBe(null);
      expect(noStorageService.get('key2')).toBe(null);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string as key', () => {
      storageService.set('', 'emptyKey');
      expect(storageService.get('')).toBe('emptyKey');
    });

    it('should handle special characters in keys', () => {
      const specialKey = 'key-with_special.chars@123';
      storageService.set(specialKey, 'value');
      expect(storageService.get(specialKey)).toBe('value');
    });

    it('should handle undefined values by converting to null', () => {
      storageService.set('undefinedValue', undefined);
      // undefined is converted to null before storage
      const result = storageService.get('undefinedValue');
      expect(result).toBe(null);
    });

    it('should handle large objects', () => {
      const largeObj = {
        data: Array(1000).fill({ name: 'test', value: 123 })
      };
      
      storageService.set('large', largeObj);
      expect(storageService.get('large')).toEqual(largeObj);
    });
  });

  describe('Memory cache fallback', () => {
    it('should clear memory cache along with storage', () => {
      // Set value in storage
      storageService.set('key', 'value');
      
      // Mock storage failure to force memory cache
      mockStorage.setItem.mockImplementation(() => {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      });
      
      storageService.set('memoryKey', 'memoryValue');
      
      // Clear should clear both
      storageService.clear();
      
      expect(storageService.get('memoryKey')).toBe(null);
    });

    it('should remove from memory cache when remove() is called', () => {
      // Force memory cache
      mockStorage.setItem.mockImplementation(() => {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      });
      
      storageService.set('memoryKey', 'memoryValue');
      expect(storageService.get('memoryKey')).toBe('memoryValue');
      
      storageService.remove('memoryKey');
      expect(storageService.get('memoryKey')).toBe(null);
    });
  });
});
