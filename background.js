let temporaryAccess = false;
let temporaryAccessTimeout = null;
let temporaryAccessUrls = new Map(); // Store URL-specific temporary access

// Initialize blocked URLs from storage
chrome.storage.local.get(["blockedUrls"], function (result) {
	if (!result.blockedUrls) {
		chrome.storage.local.set({ blockedUrls: [] });
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
	const hostname = urlObj.hostname;

	console.log("Checking URL:", url);
	console.log("Hostname:", hostname);
	console.log("Blocked URLs list:", blockedUrls);

	const shouldBlock = blockedUrls.some((blockedUrl) => {
		const cleanBlockedUrl = blockedUrl
			.replace(/^(https?:\/\/)?(www\.)?/, "")
			.replace(/\/$/, "");
		const isBlocked =
			hostname === cleanBlockedUrl ||
			(hostname.endsWith(cleanBlockedUrl.split("/")[0]) &&
				url.includes(cleanBlockedUrl));

		console.log(
			"Checking against blocked URL:",
			cleanBlockedUrl,
			"Result:",
			isBlocked
		);
		return isBlocked;
	});

	console.log("Final block decision:", shouldBlock);
	return shouldBlock;
}

// Function to handle blocking
function handleNavigation(details) {
	// Only block main frame navigation (frameId === 0), ignore iframes/embeds
	if (details.frameId !== 0) {
		console.log("Ignoring iframe/embed navigation:", details);
		return;
	}

	console.log("Main frame navigation:", details);
	chrome.storage.local.get(["blockedUrls"], function (result) {
		const blockedUrls = result.blockedUrls || [];
		if (shouldBlockUrl(details.url, blockedUrls)) {
			// Check if URL has temporary access
			const urlMatch = Array.from(temporaryAccessUrls.keys()).find(
				(blockedUrl) => details.url.includes(blockedUrl)
			);

			if (!urlMatch) {
				console.log("Blocking URL:", details.url);
				chrome.tabs.update(details.tabId, {
					url: chrome.runtime.getURL("blocked.html"),
				});
			}
		}
	});
}

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

	return true;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.type === "enableTemporaryAccess") {
		sendResponse({
			success: enableTemporaryAccess(
				message.url,
				message.duration,
				message.note
			),
		});
	} else if (message.type === "getTemporaryAccessStatus") {
		sendResponse({ temporaryAccess });
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
