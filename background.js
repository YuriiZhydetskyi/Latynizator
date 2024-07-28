let globalEnabled = false;
let uncheckedSites = [];
let checkedSites = [];
let uncheckedPages = [];
let checkedPages = [];
let tabStates = {};

function updateContextMenu(language) {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "transliterate",
      title: language === "uk" ? "Латинізувати" : "Transliterate",
      contexts: ["selection"]
    });
  });
}

function init() {
  chrome.storage.local.get(['language', 'globalEnabled', 'uncheckedSites', 'checkedSites', 'uncheckedPages', 'checkedPages'], (result) => {
    if (!result.language) {
      chrome.storage.local.set({language: chrome.i18n.getUILanguage().split('-')[0]});
    }
    globalEnabled = result.globalEnabled || false;
    uncheckedSites = result.uncheckedSites || [];
    checkedSites = result.checkedSites || [];
    uncheckedPages = result.uncheckedPages || [];
    checkedPages = result.checkedPages || [];

    updateContextMenu(result.language || 'en');
  });
}

if (chrome.runtime.onInstalled) {
  chrome.runtime.onInstalled.addListener(init);
} else {
  init();
}

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.language) {
    updateContextMenu(changes.language.newValue);
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "transliterate") {
    chrome.tabs.sendMessage(tab.id, {
      action: "transliterateSelection",
      text: info.selectionText
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
      } else if (response && response.status === "Transliteration completed") {
        console.log("Transliteration successful");
      }
    });
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  delete tabStates[tabId];
});

function shouldTransliterate(url) {
  if (!url) return false;
  try {
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
  } catch (error) {
    console.error('Invalid URL:', url);
    return false;
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "contextMenuTransliterate") {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const transliteratedText = transliterate(request.text);
      
      const span = document.createElement('span');
      span.textContent = transliteratedText;
      span.setAttribute('data-original', request.text);
      span.setAttribute('data-transliterated', 'true');
      
      range.deleteContents();
      range.insertNode(span);
      
      selection.removeAllRanges();
      selection.addRange(range);
    }
    sendResponse({status: "Transliteration completed"});
  } else if (request.action === 'getSettings') {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (tabs[0] && tabs[0].url) {
        const url = tabs[0].url;
        try {
          const hostname = new URL(url).hostname;
          const tabId = tabs[0].id;
          sendResponse({
            globalEnabled: globalEnabled,
            siteEnabled: globalEnabled ? !uncheckedSites.includes(hostname) : checkedSites.includes(hostname),
            pageEnabled: shouldTransliterate(url),
            isTransliterated: tabStates[tabId] || false
          });
        } catch (error) {
          console.error('Invalid URL:', url);
          sendResponse({
            globalEnabled: globalEnabled,
            siteEnabled: false,
            pageEnabled: false,
            isTransliterated: false
          });
        }
      } else {
        sendResponse({
          globalEnabled: globalEnabled,
          siteEnabled: false,
          pageEnabled: false,
          isTransliterated: false
        });
      }
    });
    return true;
  } else if (request.action === 'setGlobalEnabled') {
    globalEnabled = request.value;
    chrome.storage.local.set({globalEnabled: globalEnabled}, () => {
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          const shouldTransliterateTab = shouldTransliterate(tab.url);
          sendMessageToTab(tab.id, { action: shouldTransliterateTab ? 'transliterate' : 'revert' })
            .catch(error => console.error('Error sending message to tab:', error));
        });
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
      await chrome.storage.local.set({uncheckedSites, checkedSites});
      sendMessageToTab(tabs[0].id, { action: shouldTransliterate(url) ? 'transliterate' : 'revert' })
        .catch(error => console.error('Error sending message to tab:', error));
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
      await chrome.storage.local.set({uncheckedPages, checkedPages});
      sendMessageToTab(tabs[0].id, { action: request.value ? 'transliterate' : 'revert' })
        .catch(error => console.error('Error sending message to tab:', error));
    });
  } else if (request.action === 'setPageState') {
    const tabId = sender.tab.id;
    tabStates[tabId] = request.isTransliterated;
  }
  return true;
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    const shouldTransliterateTab = shouldTransliterate(tab.url);
    sendMessageToTab(tabId, { action: shouldTransliterateTab ? 'transliterate' : 'revert' })
      .catch(error => console.error('Error sending message to tab:', error));
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

// If this is a service worker environment (Chrome), export the init function
if (typeof importScripts === 'function') {
  importScripts('lib/transliteration.js');
  self.oninstall = (event) => {
    event.waitUntil(self.skipWaiting());
  };
  self.onactivate = (event) => {
    event.waitUntil(self.clients.claim());
  };
}

function sendMessageToTab(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}