// Background Service Worker for Instant Text Extractor

chrome.runtime.onInstalled.addListener(() => {
    console.log('Instant Text Extractor installed successfully.');
});

// Future: Implement clipboard polling or offscreen document for background detection
// chrome.offscreen.createDocument({ ... }) 
