let currentLanguage = 'en';

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get('language', (result) => {
    currentLanguage = result.language || 'en';
    updateContextMenu();
  });
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && 'language' in changes) {
    currentLanguage = changes.language.newValue;
    updateContextMenu();
  }
});

function updateContextMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "transliterate",
      title: currentLanguage === 'uk' ? "Латинізувати" : "Transliterate",
      contexts: ["selection"]
    });
  });
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "transliterate") {
    chrome.tabs.sendMessage(tab.id, {
      action: "transliterateSelection",
      text: info.selectionText
    });
  }
});