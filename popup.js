document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('soundToggle');
  
  // Load saved state
  chrome.storage.sync.get(['enabled'], (result) => {
    toggle.checked = result.enabled !== false; // Default to true if not set
  });

  // Save state when changed
  toggle.addEventListener('change', () => {
    const enabled = toggle.checked;
    chrome.storage.sync.set({ enabled });
    
    // Send message to content script
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { enabled });
    });
  });
});
