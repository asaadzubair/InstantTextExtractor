document.addEventListener('DOMContentLoaded', () => {
  const selectAreaBtn = document.getElementById('select-area');
  const extractClipboardBtn = document.getElementById('extract-clipboard');
  const copyTextBtn = document.getElementById('copy-text');
  const outputText = document.getElementById('output-text');
  const statusContainer = document.getElementById('status-container');
  const statusText = document.getElementById('status-text');
  const resultContainer = document.getElementById('result-container');
  const toast = document.getElementById('toast');

  let worker = null;

  // Initialize Tesseract Worker
  async function initWorker() {
    if (!worker) {
      try {
        worker = await Tesseract.createWorker('eng', 1, {
          logger: m => {
            console.log(m);
            if (m.status === 'recognizing text') {
              statusText.innerText = `Extracting: ${Math.round(m.progress * 100)}%`;
            } else if (m.status) {
              statusText.innerText = m.status;
            }
          }
        });
      } catch (err) {
        console.error("Worker initialization error:", err);
        throw new Error("Failed to initialize OCR engine");
      }
    }
    return worker;
  }

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

  // Extract text from Image URL/Blob
  async function performOCR(imageSource) {
    try {
      showStatus("Initializing OCR Engine...");

      const ocr = await initWorker();

      showStatus("Processing image...");
      const { data: { text } } = await ocr.recognize(imageSource);

      if (!text || text.trim() === "") {
        showStatus("No text found in image.");
        setTimeout(hideStatus, 3000);
      } else {
        showResult(text);
      }
    } catch (error) {
      console.error("OCR Error:", error);
      showStatus("Error: " + (error.message || "Failed to process image"));
      setTimeout(hideStatus, 5000);
    }
  }

  // Handle Clipboard Extraction
  extractClipboardBtn.addEventListener('click', async () => {
    try {
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
        const imageUrl = URL.createObjectURL(imageBlob);
        await performOCR(imageUrl);
      } else {
        showStatus("No image found in clipboard.");
        setTimeout(hideStatus, 2000);
      }
    } catch (err) {
      console.error("Clipboard access error:", err);
      showStatus("Permission denied to read clipboard.");
      setTimeout(hideStatus, 3000);
    }
  });

  // Handle Select Area (Capture Visible Tab)
  selectAreaBtn.addEventListener('click', async () => {
    showStatus("Capturing screen...");
    try {
      chrome.tabs.captureVisibleTab(null, { format: 'png' }, async (dataUrl) => {
        if (chrome.runtime.lastError) {
          showStatus("Error: " + chrome.runtime.lastError.message);
          setTimeout(hideStatus, 3000);
          return;
        }
        if (!dataUrl) {
          showStatus("Failed to capture screen.");
          setTimeout(hideStatus, 3000);
          return;
        }
        await performOCR(dataUrl);
      });
    } catch (err) {
      console.error("Capture error:", err);
      showStatus("Capture failed: " + err.message);
      setTimeout(hideStatus, 3000);
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
      // Clipboard permission not granted yet
      console.log("Clipboard check skipped:", e.message);
    }
  }

  checkClipboard();
});
