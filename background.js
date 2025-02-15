let temporaryAccessUrls = new Map(); // Store URL-specific temporary access
let tabNavigationHistory = new Map(); // Store navigation history for each tab

// Default blocked URLs
const DEFAULT_BLOCKED_URLS = ["youtube.com/shorts", "instagram.com/reels"];

// Initialize blocked URLs from storage
chrome.storage.local.get(["blockedUrls"], function (result) {
	if (!result.blockedUrls) {
		// If no blocked URLs exist, set the defaults
		chrome.storage.local.set({ blockedUrls: DEFAULT_BLOCKED_URLS });
	} else {
		// If blocked URLs exist, add defaults if they're not already there
		const existingUrls = result.blockedUrls;
		const newUrls = DEFAULT_BLOCKED_URLS.filter(
			(url) => !existingUrls.includes(url)
		);
		if (newUrls.length > 0) {
			chrome.storage.local.set({ blockedUrls: [...existingUrls, ...newUrls] });
		}
	}
});

// Initialize storage for unblock history
chrome.storage.local.get(["unblockHistory"], function (result) {
	if (!result.unblockHistory) {
		chrome.storage.local.set({ unblockHistory: [] });
	}
});

// Helper function to check if URL should be blocked
function shouldBlockUrl(url, blockedUrls) {
	const urlObj = new URL(url);
	const hostname = urlObj.hostname.toLowerCase();

	const shouldBlock = blockedUrls.some((blockedUrl) => {
		const cleanBlockedUrl = blockedUrl
			.replace(/^(https?:\/\/)?(www\.)?/, "")
			.replace(/\/$/, "")
			.toLowerCase();
		const isBlocked =
			hostname === cleanBlockedUrl ||
			(hostname.endsWith(cleanBlockedUrl.split("/")[0]) &&
				url.toLowerCase().includes(cleanBlockedUrl));

		return isBlocked;
	});

	return shouldBlock;
}

// Function to handle blocking
function handleNavigation(details) {
	// Only block main frame navigation (frameId === 0), ignore iframes/embeds
	if (details.frameId !== 0) {
		return;
	}

	// Don't track blocked.html page
	if (!details.url.includes("blocked.html")) {
		// Update navigation history for this tab
		if (!tabNavigationHistory.has(details.tabId)) {
			tabNavigationHistory.set(details.tabId, []);
		}
		tabNavigationHistory.get(details.tabId).push(details.url);
	}

	chrome.storage.local.get(["blockedUrls"], function (result) {
		const blockedUrls = result.blockedUrls || [];
		if (shouldBlockUrl(details.url, blockedUrls)) {
			// Check if URL has temporary access
			const urlMatch = Array.from(temporaryAccessUrls.entries()).find(
				([blockedUrl, accessInfo]) => {
					const isUrlMatch = details.url.includes(blockedUrl);
					const isValid = accessInfo.expiryTime > Date.now();

					// If expired, clean it up
					if (!isValid && isUrlMatch) {
						clearTimeout(accessInfo.timeoutId);
						temporaryAccessUrls.delete(blockedUrl);
					}

					return isUrlMatch && isValid;
				}
			);

			if (!urlMatch) {
				// Get the navigation history for this tab
				const history = tabNavigationHistory.get(details.tabId) || [];
				const previousUrl =
					history.length > 1 ? history[history.length - 2] : null;

				// Store the navigation data in storage for this tab
				chrome.storage.local.set({
					[`tab_${details.tabId}_navigation`]: {
						blockedUrl: details.url,
						previousUrl: previousUrl,
					},
				});

				// Redirect to blocked page
				chrome.tabs.update(details.tabId, {
					url: chrome.runtime.getURL("blocked.html"),
				});
			}
		}
	});
}

// Clean up navigation history when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
	tabNavigationHistory.delete(tabId);
	chrome.storage.local.remove(`tab_${tabId}_navigation`);
});

// Function to enable temporary access
function enableTemporaryAccess(url, duration, note) {
	if (temporaryAccessUrls.has(url)) {
		clearTimeout(temporaryAccessUrls.get(url).timeoutId);
	}

	const timeoutId = setTimeout(() => {
		temporaryAccessUrls.delete(url);
		chrome.runtime.sendMessage({
			type: "temporaryAccessExpired",
			url: url,
		});
	}, duration * 1000);

	temporaryAccessUrls.set(url, {
		timeoutId: timeoutId,
		expiryTime: Date.now() + duration * 1000,
		note: note,
	});

	// Log to history
	chrome.storage.local.get(["unblockHistory"], function (result) {
		const history = result.unblockHistory || [];
		history.push({
			url: url,
			timestamp: Date.now(),
			duration: duration,
			note: note,
		});
		chrome.storage.local.set({ unblockHistory: history });
	});

	return true;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.type === "enableTemporaryAccess") {
		const result = enableTemporaryAccess(
			message.url,
			message.duration,
			message.note
		);
		sendResponse({ success: result });
		return true;
	} else if (message.type === "getTemporaryAccessStatus") {
		const status = {
			activeUrls: Array.from(temporaryAccessUrls.entries()).map(
				([url, info]) => ({
					url,
					remainingTime: Math.max(0, (info.expiryTime - Date.now()) / 1000),
					note: info.note,
				})
			),
		};
		sendResponse(status);
		return true;
	} else if (message.type === "extendAccess") {
		const url = message.url;
		const extensionTime = message.duration || 300; // 5 minutes default
		if (temporaryAccessUrls.has(url)) {
			const currentAccess = temporaryAccessUrls.get(url);
			enableTemporaryAccess(
				url,
				Math.ceil((currentAccess.expiryTime - Date.now()) / 1000) +
					extensionTime,
				currentAccess.note + " (extended)"
			);
			sendResponse({ success: true });
		}
	} else if (message.type === "openPopup") {
		// Open the extension popup
		chrome.action.openPopup();
	} else if (message.type === "goBack") {
		if (sender.tab) {
			const tabId = sender.tab.id;
			// Get the navigation data for this tab
			chrome.storage.local.get([`tab_${tabId}_navigation`], function (result) {
				const navigationData = result[`tab_${tabId}_navigation`];
				if (navigationData && navigationData.previousUrl) {
					// Navigate back to the previous URL
					chrome.tabs.update(tabId, {
						url: navigationData.previousUrl,
					});
				} else {
					// Fallback to Google if no previous URL
					chrome.tabs.update(tabId, {
						url: "https://www.google.com",
					});
				}
			});
		}
		return true;
	} else if (message.type === "closeTab") {
		// Close the current tab
		if (sender.tab) {
			chrome.tabs.remove(sender.tab.id);
		}
	}
	return true;
});

// Remove any previous event listeners
chrome.webNavigation.onCommitted.removeListener(handleNavigation);

// Listen for all types of navigation events
chrome.webNavigation.onBeforeNavigate.addListener(handleNavigation);
chrome.webNavigation.onHistoryStateUpdated.addListener(handleNavigation);

// Also watch for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
	if (changeInfo.url) {
		handleNavigation({ tabId, url: changeInfo.url });
	}
});

// Add listener for main frame navigation
chrome.webNavigation.onCommitted.addListener(handleNavigation);
