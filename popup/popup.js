let currentLanguage = 'en';
let messages = {};

document.addEventListener('DOMContentLoaded', async () => {
  const globalEnableCheckbox = document.getElementById('globalEnable');
  const siteEnableCheckbox = document.getElementById('siteEnable');
  const pageEnableCheckbox = document.getElementById('pageEnable');
  const transliterateNowButton = document.getElementById('transliterateNow');
  const revertTransliterationButton = document.getElementById('revertTransliteration');
  const openExplanationButton = document.getElementById('openExplanation');
  const languageSelect = document.getElementById('languageSelect');

  // Load initial language and messages
  await loadLanguage();

  // Localize UI elements
  localizeUI();

  // Fetch current settings and page state
  const [settings, pageState] = await Promise.all([
    new Promise((resolve) => chrome.runtime.sendMessage({action: 'getSettings'}, resolve)),
    new Promise((resolve) => {
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {action: 'getState'}, resolve);
      });
    })
  ]);

  // Initialize checkboxes
  globalEnableCheckbox.checked = settings.globalEnabled;
  siteEnableCheckbox.checked = settings.siteEnabled;
  pageEnableCheckbox.checked = settings.pageEnabled;

  // Update UI based on the current page state
  updateUI(pageState.isTransliterated);

  // Event listeners
  globalEnableCheckbox.addEventListener('change', (e) => {
    chrome.runtime.sendMessage({action: 'setGlobalEnabled', value: e.target.checked});
    updateSiteAndPageCheckboxes();
  });

  siteEnableCheckbox.addEventListener('change', (e) => {
    chrome.runtime.sendMessage({action: 'setSiteEnabled', value: e.target.checked});
    updatePageCheckbox();
  });

  pageEnableCheckbox.addEventListener('change', (e) => {
    chrome.runtime.sendMessage({action: 'setPageEnabled', value: e.target.checked});
    updatePageState(e.target.checked);
  });

  transliterateNowButton.addEventListener('click', () => {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'transliterate'}, (response) => {
        if (response && response.status === "Transliteration completed") {
          updateUI(true);
        }
      });
    });
  });

  revertTransliterationButton.addEventListener('click', () => {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'revert'}, (response) => {
        if (response && response.status === "Transliteration reverted") {
          updateUI(false);
        }
      });
    });
  });

  openExplanationButton.addEventListener('click', () => {
    chrome.tabs.create({url: chrome.runtime.getURL('explanation/explanation.html')});
  });

  languageSelect.addEventListener('change', (e) => {
    updateLanguage(e.target.value);
  });

  // Functions
  async function loadLanguage() {
    const result = await new Promise(resolve => chrome.storage.local.get('language', resolve));
    currentLanguage = result.language || 'en';
    languageSelect.value = currentLanguage;
    const response = await fetch(chrome.runtime.getURL(`_locales/${currentLanguage}/messages.json`));
    messages = await response.json();
  }

  function localizeUI() {
    document.getElementById('extensionName').textContent = getMessage('extensionName');
    document.getElementById('enableGlobally').textContent = getMessage('enableGlobally');
    document.getElementById('enableForSite').textContent = getMessage('enableForSite');
    document.getElementById('enableForPage').textContent = getMessage('enableForPage');
    transliterateNowButton.textContent = getMessage('transliterateNow');
    revertTransliterationButton.textContent = getMessage('revertTransliteration');
    openExplanationButton.textContent = getMessage('openExplanation');
    document.getElementById('selectLanguage').textContent = getMessage('selectLanguage');
  }

  function getMessage(messageName) {
    return messages[messageName]?.message || messageName;
  }

  function updateSiteAndPageCheckboxes() {
    chrome.runtime.sendMessage({action: 'getSettings'}, (settings) => {
      siteEnableCheckbox.checked = settings.siteEnabled;
      pageEnableCheckbox.checked = settings.pageEnabled;
      updatePageState(settings.pageEnabled);
    });
  }

  function updatePageCheckbox() {
    chrome.runtime.sendMessage({action: 'getSettings'}, (settings) => {
      pageEnableCheckbox.checked = settings.pageEnabled;
      updatePageState(settings.pageEnabled);
    });
  }

  function updatePageState(shouldTransliterate) {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: shouldTransliterate ? 'transliterate' : 'revert'
      }, (response) => {
        if (response) {
          if (response.status === "Transliteration completed") {
            updateUI(true);
          } else if (response.status === "Transliteration reverted") {
            updateUI(false);
          }
        }
      });
    });
  }

  function updateUI(isTransliterated) {
    transliterateNowButton.style.display = isTransliterated ? 'none' : 'block';
    revertTransliterationButton.style.display = isTransliterated ? 'block' : 'none';
  }

  async function updateLanguage(lang) {
    await new Promise(resolve => chrome.storage.local.set({language: lang}, resolve));
    window.location.reload();
  }

  // Listen for changes from content script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'stateUpdated') {
      updateUI(request.isTransliterated);
    }
  });
});