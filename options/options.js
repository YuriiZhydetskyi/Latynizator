document.addEventListener('DOMContentLoaded', async () => {
    const autoTransliterateCheckbox = document.getElementById('autoTransliterate');
    const saveButton = document.getElementById('saveOptions');
    const statusDiv = document.getElementById('status');
  
    // Localize UI elements
    document.title = chrome.i18n.getMessage('optionsTitle');
    document.querySelector('h1').textContent = chrome.i18n.getMessage('optionsTitle');
    autoTransliterateCheckbox.nextElementSibling.textContent = chrome.i18n.getMessage('autoTransliterate');
    saveButton.textContent = chrome.i18n.getMessage('saveOptions');
  
    // Load saved options
    const options = await storage.get('options');
    autoTransliterateCheckbox.checked = options.autoTransliterate || false;
  
    saveButton.addEventListener('click', async () => {
      const newOptions = {
        autoTransliterate: autoTransliterateCheckbox.checked
      };
  
      await storage.set({options: newOptions});
  
      statusDiv.textContent = chrome.i18n.getMessage('optionsSaved');
      statusDiv.className = 'alert alert-success mt-3';
      statusDiv.style.display = 'block';
  
      setTimeout(() => {
        statusDiv.style.display = 'none';
      }, 3000);
    });
  });