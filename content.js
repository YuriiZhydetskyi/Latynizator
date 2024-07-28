
function processTextNodes(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    if (
      node.parentNode.nodeName !== "SCRIPT" &&
      node.parentNode.nodeName !== "STYLE"
    ) {
      const transliteratedText = transliterate(node.textContent);
      if (transliteratedText !== node.textContent) {
        const span = document.createElement("span");
        span.textContent = transliteratedText;
        span.setAttribute("data-original", node.textContent);
        span.setAttribute("data-transliterated", "true");
        node.parentNode.replaceChild(span, node);
      }
    }
  } else {
    for (let child of node.childNodes) {
      processTextNodes(child);
    }
  }
}

function transliteratePage() {
  processTextNodes(document.body);
  currentState.isTransliterated = true;
  chrome.runtime.sendMessage({ action: 'setPageState', isTransliterated: true });
}

function revertTransliteration() {
  const transliteratedElements = document.querySelectorAll(
    '[data-transliterated="true"]'
  );
  transliteratedElements.forEach((element) => {
    const originalText = element.getAttribute("data-original");
    const textNode = document.createTextNode(originalText);
    element.parentNode.replaceChild(textNode, element);
  });
}

let currentState = {
  isTransliterated: false,
};

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "transliterate" && !currentState.isTransliterated) {
    transliteratePage();
    currentState.isTransliterated = true;
    sendResponse({ status: "Transliteration completed" });
  } else if (request.action === "revert" && currentState.isTransliterated) {
    revertTransliteration();
    currentState.isTransliterated = false;
    sendResponse({ status: "Transliteration reverted" });
  } else if (request.action === "getState") {
    sendResponse(currentState);
  }
  return true;
});

// Observe DOM changes to transliterate dynamically added content
const observer = new MutationObserver((mutations) => {
  if (currentState.isTransliterated) {
    mutations.forEach((mutation) => {
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            processTextNodes(node);
          }
        });
      }
    });
  }
});

observer.observe(document.body, { childList: true, subtree: true });

// Initial check for auto-transliteration
chrome.runtime.sendMessage({action: 'getSettings'}, (settings) => {
  if (settings.pageEnabled) {
    transliteratePage();
  }
});

function updateBackgroundState() {
  chrome.runtime.sendMessage({
    action: "setPageState",
    isTransliterated: currentState.isTransliterated,
  });
}

// Modify the existing listener to update the background state
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "transliterate" && !currentState.isTransliterated) {
    transliteratePage();
    currentState.isTransliterated = true;
    updateBackgroundState();
    sendResponse({ status: "Transliteration completed" });
  } else if (request.action === "revert" && currentState.isTransliterated) {
    revertTransliteration();
    currentState.isTransliterated = false;
    updateBackgroundState();
    sendResponse({ status: "Transliteration reverted" });
  } else if (request.action === "getState") {
    sendResponse(currentState);
  } else if (request.action === "transliterateSelection") {
    const activeElement = document.activeElement;
    let selectedText = '';
    let startIndex, endIndex;

    if (activeElement.tagName === 'TEXTAREA' || (activeElement.tagName === 'INPUT' && activeElement.type === 'text')) {
      // Handle textarea and text input
      startIndex = activeElement.selectionStart;
      endIndex = activeElement.selectionEnd;
      selectedText = activeElement.value.substring(startIndex, endIndex);
    } else if (activeElement.isContentEditable || activeElement.getAttribute('role') === 'textbox') {
      // Handle contenteditable elements and custom inputs (like WhatsApp and Messenger)
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        selectedText = range.toString();
      }
    } else {
      // Handle regular page text
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        selectedText = range.toString();
      }
    }

    if (selectedText) {
      const transliteratedText = transliterate(selectedText);
      
      if (activeElement.tagName === 'TEXTAREA' || (activeElement.tagName === 'INPUT' && activeElement.type === 'text')) {
        // Insert text for textarea and text input
        const newValue = activeElement.value.substring(0, startIndex) + transliteratedText + activeElement.value.substring(endIndex);
        activeElement.value = newValue;
        activeElement.setSelectionRange(startIndex + transliteratedText.length, startIndex + transliteratedText.length);
        simulateUserInput(activeElement, transliteratedText);
      } else if (activeElement.isContentEditable || activeElement.getAttribute('role') === 'textbox') {
        // Handle contenteditable elements and custom inputs (like WhatsApp and Messenger)
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          range.insertNode(document.createTextNode(transliteratedText));
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
          simulateUserInput(activeElement, transliteratedText);
        }
      } else {
        // Insert text for regular page content
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          range.insertNode(document.createTextNode(transliteratedText));
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }

      sendResponse({status: "Transliteration completed"});
    } else {
      sendResponse({status: "No selection found"});
    }
  }
  return true;
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

});

updateBackgroundState();


function simulateUserInput(element, text) {
  const inputEvent = new InputEvent('input', {
    bubbles: true,
    cancelable: true,
    inputType: 'insertText',
    data: text
  });
  
  const keydownEvent = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    key: 'Process',
    code: 'Process',
    which: 229,
    keyCode: 229
  });
  
  const keyupEvent = new KeyboardEvent('keyup', {
    bubbles: true,
    cancelable: true,
    key: 'Process',
    code: 'Process',
    which: 229,
    keyCode: 229
  });

  element.focus();
  element.dispatchEvent(keydownEvent);
  element.dispatchEvent(inputEvent);
  element.dispatchEvent(keyupEvent);
}