let temporaryAccess = false;
let temporaryAccessTimeout = null;

// Initialize blocked URLs from storage
chrome.storage.local.get(["blockedUrls"], function (result) {
	if (!result.blockedUrls) {
		chrome.storage.local.set({ blockedUrls: [] });
	}
});

// Helper function to check if URL should be blocked
function shouldBlockUrl(url, blockedUrls) {
	if (temporaryAccess) {
		return false;
	}
	return blockedUrls.some((blockedUrl) => url.includes(blockedUrl));
}

// Function to handle blocking
function handleNavigation(details) {
	chrome.storage.local.get(["blockedUrls"], function (result) {
		const blockedUrls = result.blockedUrls || [];
		if (shouldBlockUrl(details.url, blockedUrls)) {
			chrome.tabs.update(details.tabId, {
				url: chrome.runtime.getURL("blocked.html"),
			});
		}
	});
}

// Function to enable temporary access
function enableTemporaryAccess() {
	temporaryAccess = true;
	if (temporaryAccessTimeout) {
		clearTimeout(temporaryAccessTimeout);
	}

	temporaryAccessTimeout = setTimeout(() => {
		temporaryAccess = false;
		chrome.runtime.sendMessage({ type: "temporaryAccessExpired" });
	}, 30000); // 30 seconds

	return true;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.type === "enableTemporaryAccess") {
		sendResponse({ success: enableTemporaryAccess() });
	} else if (message.type === "getTemporaryAccessStatus") {
		sendResponse({ temporaryAccess });
	}
});

// Listen for all types of navigation events
chrome.webNavigation.onBeforeNavigate.addListener(handleNavigation);
chrome.webNavigation.onHistoryStateUpdated.addListener(handleNavigation);
chrome.webNavigation.onCommitted.addListener(handleNavigation);

// Also watch for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
	if (changeInfo.url) {
		handleNavigation({ tabId, url: changeInfo.url });
	}
});
