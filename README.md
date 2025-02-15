# URL Blocker - Stay Focused Chrome Extension

A Chrome extension that helps you stay focused by blocking distracting websites while providing flexible temporary access when needed.

## Features

- 🚫 Block distracting websites with a simple URL input
- ⏲️ Grant temporary access with customizable durations
- 📝 Track unblock history with detailed statistics
- 🎯 Fun, motivational blocking page with productivity tips
- 🔄 Default blocks for common distractions (YouTube Shorts, Instagram Reels)

## Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension directory
5. The URL Blocker icon should appear in your Chrome toolbar

## How to Use

### Blocking Websites

1. Click the extension icon in your Chrome toolbar
2. Enter the URL you want to block (e.g., "youtube.com", "instagram.com")
3. Click "Add" or press Enter
4. The URL will appear in your blocked list

### Managing Temporary Access

When you try to visit a blocked website:

1. You'll see a blocking page with a fun meme and motivational message
2. To get temporary access:
   - Click "Manage Blocks" on the blocking page
   - Find the blocked URL in the list
   - Click "Unblock" next to the URL
   - Select the duration (30 seconds to 1 hour)
   - Enter a reason for unblocking (required)
   - Click "Grant Temporary Access"

### Viewing History

1. Click the extension icon
2. Click "View History" in the stats section
3. See your unblock history with:
   - Today's unblocks
   - This week's total
   - Average unblock duration
4. Filter history by time period (All Time, Today, This Week, This Month)

### Default Blocked Sites

The extension comes with default blocks for:

- YouTube Shorts (youtube.com/shorts)
- Instagram Reels (instagram.com/reels)

You can remove these by clicking the delete (×) button next to them.

## Tips for Success

1. **Be Specific**: Block specific URLs (e.g., "youtube.com/shorts") rather than entire domains
2. **Set Reasonable Times**: Choose temporary access durations that match your needs
3. **Track Your Habits**: Use the history view to understand your unblocking patterns
4. **Add Context**: Write meaningful notes when requesting temporary access

## Privacy

- All data is stored locally on your device
- No data is sent to external servers
- No analytics or tracking
- See PRIVACY.md for detailed information

## Contributing

Feel free to submit issues and enhancement requests!

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Technical Details

The extension uses:

- Chrome's `declarativeNetRequest` API for efficient request blocking
- Local storage for persistent settings
- Service worker for background processing
- Modern web components for the UI

## Files Structure
