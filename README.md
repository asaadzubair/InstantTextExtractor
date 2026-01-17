# Instant Text Extractor

A minimalist and premium Chrome extension that allows you to capture text from images (clipboard or screen snippets) instantly with one click.

## Features

- **Clipboard Image Detection**: Checks if an image is in your clipboard when opening the popup.
- **Screen Snipping**: Capture the current tab as an image for instant extraction.
- **OCR Text Extraction**: Powered by Tesseract.js for high-accuracy local text recognition.
- **Instant Copy**: Copy the extracted text to your clipboard with a single click.
- **Minimalist Design**: A clean, student-friendly interface with premium aesthetics.

## Repository Structure

```text
InstantTextExtractor/
    ├── chrome-extension/
    │   ├── manifest.json
    │   ├── popup.html
    │   ├── popup.js
    │   ├── style.css
    │   ├── tesseract.min.js
    │   └── icons/
    └── README.md
```

## Setup Instructions

1.  Open Chrome and navigate to `chrome://extensions/`.
2.  Enable **Developer mode** (toggle in the top right).
3.  Click **Load unpacked**.
4.  Select the `chrome-extension` folder from this project.

## Git & GitHub Practice Guide

This project is a great way to practice your Git workflow. Follow these steps to sync your code with GitHub:

### 1. Initialize Repository
If you haven't already, initialize git in your project root:
```bash
git init
```

### 2. First Commit
Add your files and create your initial commit:
```bash
git add .
git commit -m "Initial commit: basic extension structure and UI"
```
*Best Practice: Use descriptive but concise commit messages.*

### 3. Push to GitHub
1. Create a new repository on [GitHub](https://github.com/new).
2. Copy the repository URL.
3. Run the following commands:
```bash
git remote add origin <your_repo_url>
git branch -M main
git push -u origin main
```

### 4. Future Commits
Whenever you add a new feature (e.g., adding OCR logic), commit your changes:
```bash
git add .
git commit -m "Add: OCR functionality using Tesseract.js"
git push
```

## Technical Details

- **Manifest V3**: Using the latest Chrome extension standards.
- **OCR Engine**: Tesseract.js (v4.0.2).
- **Styling**: Vanilla CSS with modern flexbox and linear gradients.

---
Built with ❤️ for anyone who wants to save time.
