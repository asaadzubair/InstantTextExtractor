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

  // Initialize worker with LOCAL paths
  async function getWorker() {
    if (!worker) {
      showStatus("Initializing OCR engine...");

      // Use local worker and core files
      worker = await Tesseract.createWorker('eng', 1, {
        workerPath: chrome.runtime.getURL('worker.min.js'),
        corePath: chrome.runtime.getURL('tesseract-core.wasm.js'),
        logger: m => {
          console.log(m);
          if (m.status === 'recognizing text') {
            statusText.innerText = `Recognizing: ${Math.round(m.progress * 100)}%`;
          } else if (m.status === 'loading tesseract core') {
            statusText.innerText = 'Loading OCR engine...';
          } else if (m.status === 'initializing tesseract') {
            statusText.innerText = 'Initializing...';
          } else if (m.status === 'loading language traineddata') {
            statusText.innerText = 'Loading language data...';
          } else if (m.status === 'initializing api') {
            statusText.innerText = 'Starting OCR...';
          }
        }
      });
    }
    return worker;
  }

  // Extract text from Image
  async function performOCR(imageSource) {
    try {
      console.log("Starting OCR process...");

      const ocr = await getWorker();

      showStatus("Processing image...");
      const { data: { text } } = await ocr.recognize(imageSource);

      console.log("OCR completed. Text:", text);

      if (!text || text.trim() === "") {
        showStatus("No text found in image.");
        setTimeout(hideStatus, 3000);
      } else {
        showResult(text);
      }
    } catch (error) {
      console.error("OCR Error:", error);
      showStatus("Error: " + (error.message || "Processing failed"));
      setTimeout(hideStatus, 5000);
    }
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
  selectAreaBtn.addEventListener('click', async () => {
    showStatus("Capturing screen...");
    try {
      chrome.tabs.captureVisibleTab(null, { format: 'png' }, async (dataUrl) => {
        if (chrome.runtime.lastError) {
          console.error("Capture error:", chrome.runtime.lastError);
          showStatus("Error: " + chrome.runtime.lastError.message);
          setTimeout(hideStatus, 3000);
          return;
        }
        if (!dataUrl) {
          showStatus("Failed to capture screen.");
          setTimeout(hideStatus, 3000);
          return;
        }
        console.log("Screen captured");
        await performOCR(dataUrl);
      });
    } catch (err) {
      console.error("Capture error:", err);
      showStatus("Error: " + err.message);
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

  // Check Tesseract loaded
  console.log("Tesseract loaded:", typeof Tesseract !== 'undefined');

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
