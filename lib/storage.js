const storage = {
    get: function(keys) {
      return new Promise((resolve) => {
        chrome.storage.local.get(keys, resolve);
      });
    },
  
    set: function(items) {
      return new Promise((resolve) => {
        chrome.storage.local.set(items, resolve);
      });
    },
  
    getGlobalEnabled: async function() {
      const result = await this.get('globalEnabled');
      return result.globalEnabled || false;
    },
  
    setGlobalEnabled: function(value) {
      return this.set({globalEnabled: value});
    },
  
    getSiteSettings: async function() {
      const result = await this.get('siteSettings');
      return result.siteSettings || {};
    },
  
    setSiteSettings: function(settings) {
      return this.set({siteSettings: settings});
    }
  };
  
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = storage;
  }