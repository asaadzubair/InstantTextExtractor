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
  async function getWorker() {
    if (!worker) {
      statusText.innerText = "Initializing OCR...";
      try {
        worker = await Tesseract.createWorker({
          workerPath: chrome.runtime.getURL('worker.min.js'),
          corePath: chrome.runtime.getURL('tesseract-core.wasm.js'),
          logger: m => {
            if (m.status === 'recognizing text') {
              statusText.innerText = `Extracting: ${Math.round(m.progress * 100)}%`;
            }
          }
        });
        await worker.loadLanguage('eng');
        await worker.initialize('eng');
      } catch (err) {
        console.error("Worker Init Error:", err);
        throw err;
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
      showStatus("Starting OCR...");
      const tesseractWorker = await getWorker();
      const { data: { text } } = await tesseractWorker.recognize(imageSource);

      if (!text || text.trim() === "") {
        showStatus("No text found in image.");
        setTimeout(hideStatus, 2000);
      } else {
        showResult(text);
      }
    } catch (error) {
      console.error("OCR Error:", error);
      showStatus("Error extracting text.");
      setTimeout(hideStatus, 3000);
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
      console.error("Clipboard access denied:", err);
      showStatus("Permission denied to read clipboard.");
    }
  });

  // Handle Select Area (Capture Visible Tab for now)
  selectAreaBtn.addEventListener('click', async () => {
    showStatus("Capturing screen...");
    try {
      // In a real extension, you'd inject a content script to allow selection.
      // For this student project, we'll capture the visible tab as a "snippet".
      chrome.tabs.captureVisibleTab(null, { format: 'png' }, async (dataUrl) => {
        if (chrome.runtime.lastError) {
          showStatus("Error capturing tab.");
          return;
        }
        await performOCR(dataUrl);
      });
    } catch (err) {
      showStatus("Capture failed.");
    }
  });

  // Handle Copy Text
  copyTextBtn.addEventListener('click', () => {
    const text = outputText.value;
    if (text) {
      navigator.clipboard.writeText(text).then(() => {
        showToast("Text copied successfully!");
      });
    }
  });

  // Proactive Clipboard Check on Open
  async function checkClipboard() {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        if (item.types.some(type => type.startsWith('image/'))) {
          // If we find an image, maybe show a hint or auto-start?
          // For now, let's just make the button pulse or something.
          extractClipboardBtn.classList.add('pulse');
        }
      }
    } catch (e) { }
  }

  checkClipboard();
});
