document.addEventListener('DOMContentLoaded', () => {
  const selectAreaBtn = document.getElementById('select-area');
  const extractClipboardBtn = document.getElementById('extract-clipboard');
  const copyTextBtn = document.getElementById('copy-text');
  const outputText = document.getElementById('output-text');
  const statusContainer = document.getElementById('status-container');
  const statusText = document.getElementById('status-text');
  const resultContainer = document.getElementById('result-container');
  const toast = document.getElementById('toast');

  // Show status
  function showStatus(msg) {
    statusText.innerText = msg;
    statusContainer.classList.remove('hidden');
    resultContainer.classList.add('hidden');
  }

  // Hide status
  function hideStatus() {
    statusContainer.classList.add('hidden');
  }

  // Show result
  function showResult(text) {
    outputText.value = text.trim();
    resultContainer.classList.remove('hidden');
    hideStatus();
  }

  // Show toast message
  function showToast(msg) {
    toast.innerText = msg;
    toast.classList.add('show');
    toast.classList.remove('hidden');
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.classList.add('hidden'), 300);
    }, 2000);
  }

  // Extract text using OCR.space API (Free, no API key needed for basic use)
  async function performOCR(imageSource) {
    try {
      showStatus("Preparing image...");

      // Convert image to base64 if it's a blob URL
      let base64Image;
      if (imageSource.startsWith('blob:')) {
        const response = await fetch(imageSource);
        const blob = await response.blob();
        base64Image = await blobToBase64(blob);
      } else {
        base64Image = imageSource;
      }

      showStatus("Extracting text...");

      // Use OCR.space free API
      const formData = new FormData();
      formData.append('base64Image', base64Image);
      formData.append('language', 'eng');
      formData.append('isOverlayRequired', 'false');
      formData.append('apikey', 'helloworld');
      formData.append('scale', 'true');

      const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        body: formData
      });

      const result = await ocrResponse.json();
      console.log("OCR Result:", result);

      if (result.IsErroredOnProcessing) {
        throw new Error(result.ErrorMessage || "OCR processing failed");
      }

      if (result.ParsedResults && result.ParsedResults.length > 0) {
        const text = result.ParsedResults[0].ParsedText;
        if (text && text.trim()) {
          showResult(text);
        } else {
          showStatus("No text found in image.");
          setTimeout(hideStatus, 3000);
        }
      } else {
        throw new Error("No text extracted");
      }

    } catch (error) {
      console.error("OCR Error:", error);
      showStatus("Error: " + (error.message || "Processing failed"));
      setTimeout(hideStatus, 5000);
    }
  }

  // Convert blob to base64
  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // Handle Clipboard Extraction
  extractClipboardBtn.addEventListener('click', async () => {
    try {
      showStatus("Reading clipboard...");
      const items = await navigator.clipboard.read();
      let imageBlob = null;

      for (const item of items) {
        console.log("Clipboard item types:", item.types);
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            imageBlob = await item.getType(type);
            console.log("Found image:", type);
            break;
          }
        }
        if (imageBlob) break;
      }

      if (imageBlob) {
        const imageUrl = URL.createObjectURL(imageBlob);
        await performOCR(imageUrl);
      } else {
        showStatus("No image found in clipboard.");
        setTimeout(hideStatus, 2000);
      }
    } catch (err) {
      console.error("Clipboard error:", err);
      showStatus("Error: " + err.message);
      setTimeout(hideStatus, 3000);
    }
  });

  // Handle Select Area (Capture Visible Tab)
  // Handle Select Area (Capture Visible Tab)
  selectAreaBtn.addEventListener('click', async () => {
    try {
      showStatus("Initializing selection...");
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab) {
        showStatus("No active tab found.");
        return;
      }

      // Check for restricted URLs (like chrome://)
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
      chrome.tabs.sendMessage(tab.id, { action: 'START_SELECTION' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Msg error:", chrome.runtime.lastError);
          // Verify if it's just a closed connection (popup closed)
        }
      });

      // Close popup to let user interact with page
      window.close();

    } catch (err) {
      console.error("Selection init error:", err);
      showStatus("Error: " + err.message);
    }
  });

  // Handle Copy Text
  copyTextBtn.addEventListener('click', () => {
    const text = outputText.value;
    if (text) {
      navigator.clipboard.writeText(text).then(() => {
        showToast("Text copied successfully!");
      }).catch(err => {
        console.error("Copy failed:", err);
        showToast("Failed to copy text");
      });
    }
  });

  // Proactive Clipboard Check
  async function checkClipboard() {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        if (item.types.some(type => type.startsWith('image/'))) {
          extractClipboardBtn.classList.add('pulse');
          break;
        }
      }
    } catch (e) {
      console.log("Clipboard check:", e.message);
    }
  }

  checkClipboard();
});
