// Function to open extension popup
function openExtension() {
	chrome.runtime.sendMessage({ type: "openPopup" });
}

// Function to go back to previous page
function goBack() {
	// Log for debugging
	console.log("Requesting navigation back...");

	// Send message to background script to handle navigation
	chrome.runtime.sendMessage({ type: "goBack" });
}

// Function to initialize the page
function initializePage() {
	// Set up button click handlers
	const goBackButton = document.querySelector(".button.secondary");
	if (goBackButton) {
		console.log("Go back button found, attaching listener");
		goBackButton.addEventListener("click", goBack);
	} else {
		console.error("Go back button not found!");
	}

	const manageButton = document.querySelector(".button.primary");
	if (manageButton) {
		manageButton.addEventListener("click", openExtension);
	}
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", initializePage);

// Log when the script loads
console.log("blocked-ui.js loaded");
