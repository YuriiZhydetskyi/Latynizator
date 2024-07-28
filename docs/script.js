document.addEventListener('DOMContentLoaded', () => {
  const inputText = document.getElementById('inputText');
  const outputText = document.getElementById('outputText');
  const transliterateButton = document.getElementById('transliterateButton');
  const copyButton = document.getElementById('copyButton');

  transliterateButton.addEventListener('click', () => {
    const input = inputText.value;
    const transliterated = transliterate(input);
    outputText.value = transliterated;
  });

  copyButton.addEventListener('click', () => {
    outputText.select();
    document.execCommand('copy');
    
    // Visual feedback
    const originalText = copyButton.textContent;
    copyButton.textContent = 'Скопійовано!';
    copyButton.classList.add('btn-success');
    copyButton.classList.remove('btn-secondary');
    
    setTimeout(() => {
      copyButton.textContent = originalText;
      copyButton.classList.remove('btn-success');
      copyButton.classList.add('btn-secondary');
    }, 2000);
  });

  // Auto-resize textareas
  function autoResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }

  inputText.addEventListener('input', () => {
    autoResize(inputText);
    if (outputText.value) {
      const transliterated = transliterate(inputText.value);
      outputText.value = transliterated;
      autoResize(outputText);
    }
  });

  // Initial resize
  autoResize(inputText);
  autoResize(outputText);
});