
document.addEventListener('DOMContentLoaded', () => {
  const selectAreaBtn = document.getElementById('select-area');
  const extractClipboardBtn = document.getElementById('extract-clipboard');
  const statusContainer = document.getElementById('status-container');
  const statusText = document.getElementById('status-text');

  // Show status
  function showStatus(msg) {
    statusText.innerText = msg;
    statusContainer.classList.remove('hidden');
  }

  // Handle Select Area (Capture Visible Tab)
  selectAreaBtn.addEventListener('click', async () => {
    try {
      showStatus("Initializing selection...");
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab) {
        showStatus("No active tab found.");
        return;
      }

      if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
        showStatus("Cannot crop on system pages.");
        return;
      }

      // Inject content script
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });

      // Send start message
      chrome.tabs.sendMessage(tab.id, { action: 'START_SELECTION' });

      window.close();

    } catch (err) {
      console.error("Selection init error:", err);
      showStatus("Error: " + err.message);
    }
  });

  // Handle Clipboard Extraction
  extractClipboardBtn.addEventListener('click', async () => {
    try {
      showStatus("Reading clipboard...");
      const items = await navigator.clipboard.read();
      let imageBlob = null;

      for (const item of items) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            imageBlob = await item.getType(type);
            break;
          }
        }
        if (imageBlob) break;
      }

      if (imageBlob) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Image = reader.result;

          showStatus("Processing...");

          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

          if (!tab) {
            showStatus("No active tab to show results.");
            return;
          }

          // Inject content script just in case it's not there (for the notification)
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          });

          // Send to background
          chrome.runtime.sendMessage({
            action: 'EXTRACT_FROM_IMAGE',
            imageData: base64Image,
            tabId: tab.id
          });

          window.close();
        };
        reader.readAsDataURL(imageBlob);

      } else {
        showStatus("No image found in clipboard.");
        setTimeout(() => window.close(), 2000);
      }
    } catch (err) {
      console.error("Clipboard error:", err);
      showStatus("Error: " + err.message);
    }
  });

  // Proactive Clipboard Check
  async function checkClipboard() {
    try {
      if (!navigator.clipboard) return;
      const items = await navigator.clipboard.read();
      for (const item of items) {
        if (item.types.some(type => type.startsWith('image/'))) {
          extractClipboardBtn.classList.add('pulse');
          break;
        }
      }
    } catch (e) {
      // Ignore permission errors etc
    }
  }

  checkClipboard();
});
