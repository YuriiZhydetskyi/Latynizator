const uiUtils = {
    updateButtonVisibility: function(transliterateButton, revertButton, isTransliterated) {
      transliterateButton.style.display = isTransliterated ? 'none' : 'block';
      revertButton.style.display = isTransliterated ? 'block' : 'none';
    },
  
    showNotification: function(message, type = 'info') {
      const notification = document.createElement('div');
      notification.textContent = message;
      notification.className = `alert alert-${type} mt-3`;
      document.body.appendChild(notification);
  
      setTimeout(() => {
        notification.remove();
      }, 3000);
    },
  
    createToggle: function(id, label, checked = false, onChange) {
      const wrapper = document.createElement('div');
      wrapper.className = 'form-check form-switch mt-2';
  
      const input = document.createElement('input');
      input.className = 'form-check-input';
      input.type = 'checkbox';
      input.id = id;
      input.checked = checked;
  
      const labelElement = document.createElement('label');
      labelElement.className = 'form-check-label';
      labelElement.htmlFor = id;
      labelElement.textContent = label;
  
      wrapper.appendChild(input);
      wrapper.appendChild(labelElement);
  
      if (onChange) {
        input.addEventListener('change', onChange);
      }
  
      return wrapper;
    }
  };
  
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = uiUtils;
  }