
// Background Service Worker for Instant Text Extractor

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'CAPTURE_AND_EXTRACT') {
        handleCaptureAndExtract(request.area, sender.tab.id);
    } else if (request.action === 'EXTRACT_FROM_IMAGE') {
        handleImageExtraction(request.imageData, request.tabId);
    }
});

async function handleCaptureAndExtract(area, tabId) {
    let croppedDataUrl = null;
    try {
        // 1. Capture Visible Tab
        const dataUrl = await captureTab();

        // 2. Crop the image
        croppedDataUrl = await cropImage(dataUrl, area);

        // 3. Perform OCR
        const text = await performOCR(croppedDataUrl);

        // 4. Send result back to content script
        sendResult(tabId, text, croppedDataUrl);

    } catch (error) {
        console.error("Extraction failed:", error);
        sendError(tabId, error.message || "Extraction Failed", croppedDataUrl);
    }
}

async function handleImageExtraction(base64Image, tabId) {
    try {
        // Perform OCR directly on the provided image
        const text = await performOCR(base64Image);
        sendResult(tabId, text, base64Image);
    } catch (error) {
        console.error("Clipboard extraction failed:", error);
        sendError(tabId, error.message || "Clipboard Extraction Failed", base64Image);
    }
}

function sendResult(tabId, text, debugImage) {
    if (text) {
        chrome.tabs.sendMessage(tabId, { action: 'SHOW_RESULT', text: text, debugImage: debugImage });
    } else {
        chrome.tabs.sendMessage(tabId, { action: 'SHOW_ERROR', message: "No text found", debugImage: debugImage });
    }
}

function sendError(tabId, message, debugImage) {
    chrome.tabs.sendMessage(tabId, { action: 'SHOW_ERROR', message: message, debugImage: debugImage });
}

function captureTab() {
    return new Promise((resolve, reject) => {
        chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(dataUrl);
            }
        });
    });
}

async function cropImage(dataUrl, area) {
    try {
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const bitmap = await createImageBitmap(blob);

        const { width, height, x, y } = area;

        // Validate dimensions
        if (width <= 0 || height <= 0) {
            throw new Error("Invalid selection area");
        }

        const canvas = new OffscreenCanvas(width, height);
        const ctx = canvas.getContext('2d');

        ctx.drawImage(bitmap, x, y, width, height, 0, 0, width, height);

        const croppedBlob = await canvas.convertToBlob({ type: 'image/png' });

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(croppedBlob);
        });

    } catch (e) {
        console.error("Crop error:", e);
        throw e;
    }
}

async function performOCR(base64Image) {
    const formData = new FormData();
    formData.append('base64Image', base64Image);
    formData.append('language', 'eng');
    formData.append('isOverlayRequired', 'false');
    formData.append('apikey', 'helloworld');
    formData.append('scale', 'true');

    try {
        const response = await fetch('https://api.ocr.space/parse/image', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.IsErroredOnProcessing) {
            throw new Error(result.ErrorMessage || "OCR API Error");
        }

        if (result.ParsedResults && result.ParsedResults.length > 0) {
            return result.ParsedResults[0].ParsedText;
        } else {
            return null;
        }
    } catch (e) {
        throw new Error("OCR Network/API Error: " + e.message);
    }
}
