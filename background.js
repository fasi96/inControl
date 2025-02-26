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

// Initialize temporaryAccessUrls from storage on startup
chrome.storage.local.get(["temporaryAccess"], function (result) {
	if (result.temporaryAccess) {
		Object.entries(result.temporaryAccess).forEach(([url, access]) => {
			const now = Date.now();
			if (access.expiryTime > now) {
				const remainingTime = access.expiryTime - now;
				enableTemporaryAccess(
					url,
					Math.ceil(remainingTime / 1000),
					access.note
				);
			}
		});
	}
});

// Helper function for debugging
function debugLog(type, message, data = null) {
	const timestamp = new Date().toISOString();
	const logMessage = `[${timestamp}] [${type}] ${message}`;
	console.log(logMessage);
	if (data) {
		console.log("Data:", data);
	}

	// Store log in chrome.storage.local
	chrome.storage.local.get(["debugLogs"], function (result) {
		const logs = result.debugLogs || [];
		logs.push({
			timestamp,
			type,
			message,
			data,
		});

		// Keep only last 1000 logs to prevent storage issues
		if (logs.length > 1000) {
			logs.splice(0, logs.length - 1000);
		}

		chrome.storage.local.set({ debugLogs: logs });
	});
}

// Add function to retrieve logs
function getDebugLogs() {
	return new Promise((resolve) => {
		chrome.storage.local.get(["debugLogs"], function (result) {
			resolve(result.debugLogs || []);
		});
	});
}

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

// Remove any previous event listeners and set up navigation handling
chrome.webNavigation.onCommitted.removeListener(handleNavigation);
chrome.webNavigation.onBeforeNavigate.removeListener(handleNavigation);
chrome.webNavigation.onHistoryStateUpdated.removeListener(handleNavigation);

// Function to handle blocking
function handleNavigation(details) {
	debugLog("NAVIGATION", `Handling navigation for URL: ${details.url}`);

	// Only block main frame navigation (frameId === 0), ignore iframes/embeds
	if (details.frameId !== 0 || details.url.includes("blocked.html")) {
		debugLog("NAVIGATION", "Ignoring navigation - iframe or blocked.html");
		return;
	}

	// Update navigation history for this tab
	if (!tabNavigationHistory.has(details.tabId)) {
		tabNavigationHistory.set(details.tabId, []);
	}
	tabNavigationHistory.get(details.tabId).push(details.url);

	// Debug current temporary access state
	debugLog(
		"TEMP_ACCESS",
		"Current temporary access entries:",
		Array.from(temporaryAccessUrls.entries()).map(([url, info]) => ({
			url,
			expiryTime: new Date(info.expiryTime).toISOString(),
			remainingTime: Math.round((info.expiryTime - Date.now()) / 1000),
			note: info.note,
		}))
	);

	// First check if URL has temporary access before checking if it should be blocked
	const hasTemporaryAccess = Array.from(temporaryAccessUrls.entries()).some(
		([blockedUrl, accessInfo]) => {
			const currentTime = Date.now();
			const isUrlMatch = details.url
				.toLowerCase()
				.includes(blockedUrl.toLowerCase());
			const isValid = accessInfo.expiryTime > currentTime;
			const remainingTime = Math.round(
				(accessInfo.expiryTime - currentTime) / 1000
			);

			debugLog("ACCESS_CHECK", `Checking temporary access for ${blockedUrl}`, {
				currentUrl: details.url,
				isUrlMatch,
				isValid,
				remainingTime,
				currentTimeISO: new Date(currentTime).toISOString(),
				expiryTimeISO: new Date(accessInfo.expiryTime).toISOString(),
				originalDuration: accessInfo.duration,
				note: accessInfo.note,
			});

			// If expired, clean it up
			if (!isValid) {
				debugLog("ACCESS_EXPIRED", `Access expired for ${blockedUrl}`);
				clearTimeout(accessInfo.timeoutId);
				temporaryAccessUrls.delete(blockedUrl);
				return false;
			}

			return isUrlMatch && isValid;
		}
	);

	// If URL has temporary access, allow navigation
	if (hasTemporaryAccess) {
		debugLog(
			"ACCESS_GRANTED",
			`Allowing navigation to ${details.url} - temporary access valid`
		);
		return;
	}

	// Check if URL should be blocked
	chrome.storage.local.get(["blockedUrls"], function (result) {
		const blockedUrls = result.blockedUrls || [];
		debugLog(
			"BLOCK_CHECK",
			`Checking if URL should be blocked: ${details.url}`,
			{
				blockedUrls,
			}
		);

		if (shouldBlockUrl(details.url, blockedUrls)) {
			debugLog("URL_BLOCKED", `Blocking access to ${details.url}`);

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
		} else {
			debugLog(
				"URL_ALLOWED",
				`Allowing access to ${details.url} - not in block list`
			);
		}
	});
}

// Set up a single listener for navigation events
chrome.webNavigation.onCommitted.addListener(handleNavigation);

// Watch for tab URL updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
	if (changeInfo.url) {
		handleNavigation({ tabId, url: changeInfo.url, frameId: 0 });
	}
});

// Function to enable temporary access
function enableTemporaryAccess(url, duration, note) {
	const startTime = Date.now();
	debugLog("ENABLE_ACCESS", `Enabling temporary access for ${url}`, {
		duration,
		note,
		startTimeISO: new Date(startTime).toISOString(),
	});

	// Clean up any existing temporary access for this URL
	if (temporaryAccessUrls.has(url)) {
		debugLog("CLEANUP", `Cleaning up existing temporary access for ${url}`);
		clearTimeout(temporaryAccessUrls.get(url).timeoutId);
	}

	const expiryTime = startTime + duration * 1000;
	debugLog("ACCESS_TIMING", `Setting up access timing`, {
		startTimeISO: new Date(startTime).toISOString(),
		expiryTimeISO: new Date(expiryTime).toISOString(),
		duration,
		calculatedDurationMs: expiryTime - startTime,
		expectedDurationMs: duration * 1000,
	});

	// Create timeout function
	const timeoutFn = () => {
		const currentTime = Date.now();
		debugLog("ACCESS_TIMEOUT", `Access expired for ${url}`, {
			originalStartTimeISO: new Date(startTime).toISOString(),
			expiryTimeISO: new Date(expiryTime).toISOString(),
			actualExpiryTimeISO: new Date(currentTime).toISOString(),
			expectedDurationMs: duration * 1000,
			actualDurationMs: currentTime - startTime,
		});

		// Remove from temporaryAccessUrls
		temporaryAccessUrls.delete(url);

		// Update storage
		chrome.storage.local.get(["temporaryAccess"], function (result) {
			const temporaryAccess = result.temporaryAccess || {};
			delete temporaryAccess[url];
			chrome.storage.local.set({ temporaryAccess });
		});

		// Notify about expiration
		chrome.runtime.sendMessage({
			type: "temporaryAccessExpired",
			url: url,
		});
	};

	const timeoutId = setTimeout(timeoutFn, duration * 1000);

	// Store access info both in memory and storage
	const accessInfo = {
		timeoutId,
		expiryTime,
		note,
		duration,
	};

	temporaryAccessUrls.set(url, accessInfo);

	// Store in persistent storage
	chrome.storage.local.get(["temporaryAccess"], function (result) {
		const temporaryAccess = result.temporaryAccess || {};
		temporaryAccess[url] = {
			expiryTime,
			note,
			duration,
		};
		chrome.storage.local.set({ temporaryAccess });
	});

	debugLog("ACCESS_STORED", `Temporary access info stored`, {
		url,
		expiryTime: new Date(expiryTime).toISOString(),
		duration,
	});

	// Log to history
	chrome.storage.local.get(["unblockHistory"], function (result) {
		const history = result.unblockHistory || [];
		history.push({
			url: url,
			timestamp: startTime,
			duration: duration,
			note: note,
			expiryTime: expiryTime,
		});
		chrome.storage.local.set({ unblockHistory: history });
		debugLog("HISTORY_UPDATED", `Access history updated for ${url}`);
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
	} else if (message.type === "clearTemporaryAccess") {
		const url = message.url;
		if (temporaryAccessUrls.has(url)) {
			// Clear the timeout
			clearTimeout(temporaryAccessUrls.get(url).timeoutId);
			// Remove from temporary access map
			temporaryAccessUrls.delete(url);

			// Update storage
			chrome.storage.local.get(["temporaryAccess"], function (result) {
				const temporaryAccess = result.temporaryAccess || {};
				delete temporaryAccess[url];
				chrome.storage.local.set({ temporaryAccess });
			});

			// Notify that temporary access has expired
			chrome.runtime.sendMessage({
				type: "temporaryAccessExpired",
				url: url,
			});

			sendResponse({ success: true });
		} else {
			sendResponse({ success: false });
		}
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
	} else if (message.type === "getDebugLogs") {
		getDebugLogs().then((logs) => {
			sendResponse({ logs });
		});
		return true;
	}
	return true;
});
