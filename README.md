# URL Blocker - Stay Focused Chrome Extension

A Chrome extension that helps you stay focused by blocking distracting websites while providing flexible temporary access when needed.

## Features

- 🚫 Block distracting websites with a simple URL input
- ⏲️ Grant temporary access with customizable durations
- 📝 Track unblock history with detailed statistics
- 🎯 Fun, motivational blocking page with productivity tips
- 🔄 Default blocks for common distractions (YouTube Shorts, Instagram Reels)

## Installation

1. Download this repository

   - Go to the GitHub repository
   - Click the green "Code" button
   - Select "Download ZIP"
   - Extract the ZIP file to a location on your computer

2. Open Chrome and access the extensions page

   - Option A: Type `chrome://extensions/` in your address bar
   - Option B: Click the three dots menu (⋮) > More Tools > Extensions

3. Enable Developer mode

   - Look for the toggle switch in the top-right corner
   - Make sure it's switched ON (you'll see it turn blue)

4. Load the extension

   - Click the "Load unpacked" button that appears in the top-left
   - Navigate to the folder where you extracted the extension
   - Select the main extension directory (the one containing manifest.json)
   - Click "Select Folder" (Windows) or "Open" (Mac)

5. Verify the installation

   - The URL Blocker icon should appear in your Chrome toolbar
   - If you don't see it, click the puzzle piece icon to find it
   - Optional: Pin the extension by clicking the pin icon next to it

6. Test the installation
   - Click the URL Blocker icon to open the popup
   - Try adding a test URL to ensure it's working properly
   - Visit a blocked site to confirm the blocking page appears

Note: If you encounter any issues during installation:

- Make sure all files are properly extracted
- Try refreshing the extensions page
- Check the console for any error messages
- Restart Chrome if necessary

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
