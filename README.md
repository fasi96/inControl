# URL Blocker Chrome Extension

A powerful Chrome extension that helps you stay focused by blocking distracting websites while providing flexible temporary access when needed.

## Features

- 🚫 Block any website with simple URL patterns
- ⏲️ Temporary access with customizable durations
- 📝 Require justification notes for unblocking
- 📊 Track unblock history and usage statistics
- 🎨 Clean, modern interface
- 🖼️ Random block page images
- 🔒 Built-in blocks for common distractions (YouTube Shorts, TikTok, Facebook Reels)

## Installation

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory

## Usage

### Blocking Websites

1. Click the extension icon in your toolbar
2. Enter the URL you want to block (e.g., `youtube.com`)
3. Click "Add" or press Enter

### Temporary Access

1. When you need temporary access to a blocked site:
   - Click the extension icon
   - Find the blocked URL
   - Click "Unblock"
2. Select duration (30 seconds to 1 hour)
3. Provide a reason for access
4. Click "Grant Temporary Access"

### View History

- Click "View History" to see your unblock patterns
- Track recent usage in the stats section

## Technical Details

The extension uses:

- Chrome's `declarativeNetRequest` API for efficient request blocking
- Local storage for persistent settings
- Service worker for background processing
- Modern web components for the UI

## Files Structure
