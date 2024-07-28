let globalEnabled = false;
let uncheckedSites = [];
let checkedSites = [];
let uncheckedPages = [];
let checkedPages = [];
let tabStates = {};

chrome.runtime.onInstalled.addListener(async () => {
  globalEnabled = await storage.getGlobalEnabled();
  uncheckedSites = await storage.getUncheckedSites();
  checkedSites = await storage.getCheckedSites();
  uncheckedPages = await storage.getUncheckedPages();
  checkedPages = await storage.getCheckedPages();
});

chrome.tabs.onRemoved.addListener((tabId) => {
  delete tabStates[tabId];
});

function shouldTransliterate(url) {
  const hostname = new URL(url).hostname;
  if (globalEnabled) {
    if (uncheckedSites.includes(hostname)) {
      return checkedPages.includes(url);
    }
    return !uncheckedPages.includes(url);
  } else {
    if (checkedSites.includes(hostname)) {
      return !uncheckedPages.includes(url);
    }
    return checkedPages.includes(url);
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSettings') {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      const url = tabs[0].url;
      const hostname = new URL(url).hostname;
      const tabId = tabs[0].id;
      sendResponse({
        globalEnabled: globalEnabled,
        siteEnabled: globalEnabled ? !uncheckedSites.includes(hostname) : checkedSites.includes(hostname),
        pageEnabled: shouldTransliterate(url),
        isTransliterated: tabStates[tabId] || false
      });
    });
    return true;
  } else if (request.action === 'setGlobalEnabled') {
    globalEnabled = request.value;
    storage.setGlobalEnabled(globalEnabled);
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        const shouldTransliterate = globalEnabled && !uncheckedSites.includes(new URL(tab.url).hostname) && !uncheckedPages.includes(tab.url);
        chrome.tabs.sendMessage(tab.id, { action: shouldTransliterate ? 'transliterate' : 'revert' });
      });
    });
  } else if (request.action === 'setSiteEnabled') {
    chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
      const url = tabs[0].url;
      const hostname = new URL(url).hostname;
      if (request.value) {
        uncheckedSites = uncheckedSites.filter(site => site !== hostname);
        if (!globalEnabled) {
          checkedSites.push(hostname);
        }
      } else {
        if (globalEnabled) {
          uncheckedSites.push(hostname);
        } else {
          checkedSites = checkedSites.filter(site => site !== hostname);
        }
      }
      await storage.setUncheckedSites(uncheckedSites);
      await storage.setCheckedSites(checkedSites);
      chrome.tabs.sendMessage(tabs[0].id, { action: shouldTransliterate(url) ? 'transliterate' : 'revert' });
    });
  } else if (request.action === 'setPageEnabled') {
    chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
      const url = tabs[0].url;
      if (request.value) {
        uncheckedPages = uncheckedPages.filter(page => page !== url);
        checkedPages.push(url);
      } else {
        checkedPages = checkedPages.filter(page => page !== url);
        uncheckedPages.push(url);
      }
      await storage.setUncheckedPages(uncheckedPages);
      await storage.setCheckedPages(checkedPages);
      chrome.tabs.sendMessage(tabs[0].id, { action: request.value ? 'transliterate' : 'revert' });
    });
  } else if (request.action === 'setPageState') {
    const tabId = sender.tab.id;
    tabStates[tabId] = request.isTransliterated;
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    const shouldTransliterateTab = shouldTransliterate(tab.url);
    chrome.tabs.sendMessage(tabId, { action: shouldTransliterateTab ? 'transliterate' : 'revert' });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'setLanguage') {
    chrome.storage.local.set({language: request.language}, () => {
      sendResponse({status: 'Language updated'});
    });
    return true;
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get('language', (result) => {
    if (!result.language) {
      chrome.storage.local.set({language: chrome.i18n.getUILanguage().split('-')[0]});
    }
  });
});