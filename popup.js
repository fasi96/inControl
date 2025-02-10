document.addEventListener("DOMContentLoaded", function () {
	loadBlockedUrls();
	updateStats();
	setupHistoryModal();

	document.getElementById("addBtn").addEventListener("click", addUrl);
	document
		.getElementById("urlInput")
		.addEventListener("keypress", function (e) {
			if (e.key === "Enter") addUrl();
		});
});

function addUrl() {
	const input = document.getElementById("urlInput");
	const url = input.value.trim();
	if (url) {
		chrome.storage.local.get(["blockedUrls"], function (result) {
			const blockedUrls = result.blockedUrls || [];
			if (!blockedUrls.includes(url)) {
				blockedUrls.push(url);
				chrome.storage.local.set({ blockedUrls: blockedUrls }, function () {
					displayUrls(blockedUrls);
					input.value = "";
				});
			}
		});
	}
}

function displayUrls(urls) {
	const urlList = document.getElementById("urlList");
	urlList.innerHTML = "";

	if (urls.length === 0) {
		urlList.innerHTML = `
			<div style="text-align: center; color: #757575; padding: 20px;">
				No blocked websites yet
			</div>`;
		return;
	}

	urls.forEach((url) => {
		const div = document.createElement("div");
		div.className = "urlItem";

		const text = document.createElement("span");
		text.textContent = url;
		text.className = "urlText";
		text.title = url; // Show full URL on hover

		const controlsDiv = document.createElement("div");
		controlsDiv.className = "urlControls";

		const unblockBtn = document.createElement("button");
		unblockBtn.className = "unblockBtn";

		// Create progress bar element
		const progressBar = document.createElement("div");
		progressBar.className = "progress-bar";

		// Create text container
		const buttonText = document.createElement("span");
		buttonText.className = "button-text";
		buttonText.textContent = "Unblock";

		unblockBtn.appendChild(progressBar);
		unblockBtn.appendChild(buttonText);

		unblockBtn.onclick = () => {
			// Reset any other active items
			document
				.querySelectorAll(".urlItem")
				.forEach((item) => (item.style.background = ""));
			// Highlight selected item
			div.style.background = "#E3F2FD";
			showUnblockOptions(url);
		};

		const deleteBtn = document.createElement("span");
		deleteBtn.innerHTML = "&times;";
		deleteBtn.className = "deleteBtn";
		deleteBtn.title = "Remove from block list";
		deleteBtn.onclick = () => {
			if (confirm(`Remove ${url} from block list?`)) {
				removeUrl(url);
			}
		};

		controlsDiv.appendChild(unblockBtn);
		controlsDiv.appendChild(deleteBtn);

		div.appendChild(text);
		div.appendChild(controlsDiv);
		urlList.appendChild(div);
	});
}

function showUnblockOptions(url) {
	const unblockSection = document.getElementById("unblockSection");
	const selectedUrlDiv = unblockSection.querySelector(".selectedUrl");
	const noteInput = unblockSection.querySelector(".noteInput");
	const timeSelect = unblockSection.querySelector(".timeSelect");
	const confirmBtn = unblockSection.querySelector(".confirmBtn");

	// Smooth scroll to unblock section
	unblockSection.scrollIntoView({ behavior: "smooth" });

	// Show the section with animation
	unblockSection.style.opacity = "0";
	unblockSection.classList.add("active");
	setTimeout(() => {
		unblockSection.style.opacity = "1";
		unblockSection.style.transition = "opacity 0.3s";
	}, 0);

	selectedUrlDiv.textContent = `Selected: ${url}`;
	noteInput.value = "";
	noteInput.focus();

	confirmBtn.disabled = true;

	noteInput.oninput = () => {
		confirmBtn.disabled = !noteInput.value.trim();
	};

	confirmBtn.onclick = () => {
		const note = noteInput.value.trim();
		if (!note) {
			noteInput.focus();
			return;
		}

		handleUnblockRequest(url, timeSelect, noteInput, unblockSection);
	};
}

function removeUrl(urlToRemove) {
	chrome.storage.local.get(["blockedUrls"], function (result) {
		const blockedUrls = result.blockedUrls.filter((url) => url !== urlToRemove);
		chrome.storage.local.set({ blockedUrls: blockedUrls }, function () {
			displayUrls(blockedUrls);
		});
	});
}

function handleUnblockRequest(url, timeSelect, noteInput, unblockSection) {
	const duration = parseInt(timeSelect.value);
	const expiryTime = Date.now() + duration * 1000;

	const request = {
		url: url,
		duration: duration,
		note: noteInput.value.trim(),
		timestamp: new Date().toISOString(),
		expiryTime: expiryTime, // Add expiry time to request
	};

	chrome.runtime.sendMessage(
		{
			type: "enableTemporaryAccess",
			...request,
		},
		(response) => {
			if (response.success) {
				// Save to history
				chrome.storage.local.get(["unblockHistory"], function (result) {
					const history = result.unblockHistory || [];
					history.push(request);
					chrome.storage.local.set({ unblockHistory: history });
				});

				// Save temporary access state
				chrome.storage.local.get(["temporaryAccess"], function (result) {
					const temporaryAccess = result.temporaryAccess || {};
					temporaryAccess[url] = {
						expiryTime: expiryTime,
						duration: duration,
					};
					chrome.storage.local.set({ temporaryAccess: temporaryAccess });
				});

				// Reset and hide unblock section
				unblockSection.classList.remove("active");
				noteInput.value = "";

				// Update button with progress bar
				updateUrlItemProgress(url, duration, expiryTime);

				// Update stats after new unblock
				updateStats();
			}
		}
	);
}

function updateUrlItemProgress(url, duration, expiryTime) {
	const urlItems = document.querySelectorAll(".urlItem");
	urlItems.forEach((item) => {
		if (item.querySelector(".urlText").textContent === url) {
			const unblockBtn = item.querySelector(".unblockBtn");
			const progressBar = unblockBtn.querySelector(".progress-bar");
			const buttonText = unblockBtn.querySelector(".button-text");

			const remainingTime = Math.max(
				0,
				Math.ceil((expiryTime - Date.now()) / 1000)
			);
			if (remainingTime > 0) {
				startProgressBar(
					unblockBtn,
					progressBar,
					buttonText,
					remainingTime,
					duration
				);
			}
		}
	});
}

function loadBlockedUrls() {
	chrome.storage.local.get(
		["blockedUrls", "temporaryAccess"],
		function (result) {
			const urls = result.blockedUrls || [];
			const temporaryAccess = result.temporaryAccess || {};

			displayUrls(urls);

			// Check for active temporary access
			Object.entries(temporaryAccess).forEach(([url, access]) => {
				if (access && access.expiryTime > Date.now()) {
					updateUrlItemProgress(url, access.duration, access.expiryTime);
				} else {
					// Clean up expired entries
					delete temporaryAccess[url];
				}
			});

			// Save cleaned up temporary access
			chrome.storage.local.set({ temporaryAccess: temporaryAccess });
		}
	);
}

function startProgressBar(
	button,
	progressBar,
	buttonText,
	remainingTime,
	totalDuration
) {
	const startTime = Date.now();
	button.classList.add("in-progress");

	// Calculate the elapsed time and progress percentage
	const elapsedTime = totalDuration - remainingTime;
	const progressPercentage = (elapsedTime / totalDuration) * 100;

	// Initialize progress bar at the current progress
	progressBar.style.transition = "none";
	progressBar.style.width = `${progressPercentage}%`;

	// Force a reflow
	progressBar.offsetHeight;

	// Start the progress animation from current position
	progressBar.style.transition = `width ${remainingTime}s linear`;
	progressBar.style.width = "100%";

	// Update the button text
	buttonText.textContent = `${remainingTime}s`;

	// Update remaining time
	const updateInterval = setInterval(() => {
		const elapsed = Date.now() - startTime;
		const remaining = Math.max(0, Math.ceil(remainingTime - elapsed / 1000));

		if (remaining > 0) {
			buttonText.textContent = `${remaining}s`;
		} else {
			clearInterval(updateInterval);
			resetButton(button, buttonText, progressBar);
		}
	}, 1000);

	// Cleanup
	setTimeout(() => {
		resetButton(button, buttonText, progressBar);
		clearInterval(updateInterval);
	}, remainingTime * 1000);
}

function resetButton(button, buttonText, progressBar) {
	button.classList.remove("in-progress");
	buttonText.textContent = "Unblock";
	progressBar.style.width = "0%";
	progressBar.style.transition = "none";
}

// Add cleanup on extension reload/update
chrome.runtime.onInstalled.addListener(() => {
	chrome.storage.local.get(["temporaryAccess"], function (result) {
		const temporaryAccess = result.temporaryAccess || {};
		const now = Date.now();

		// Clean up expired entries
		Object.entries(temporaryAccess).forEach(([url, access]) => {
			if (access.expiryTime <= now) {
				delete temporaryAccess[url];
			}
		});

		chrome.storage.local.set({ temporaryAccess: temporaryAccess });
	});
});

// Listen for temporary access expiration
chrome.runtime.onMessage.addListener((message) => {
	if (message.type === "temporaryAccessExpired") {
		loadBlockedUrls(); // Reload the list to update UI
	}
});

function updateStats() {
	chrome.storage.local.get(["unblockHistory"], function (result) {
		const history = result.unblockHistory || [];
		const oneHourAgo = Date.now() - 60 * 60 * 1000;

		const recentUnblocks = history.filter(
			(item) => new Date(item.timestamp).getTime() > oneHourAgo
		);

		// Calculate total minutes
		const totalSeconds = recentUnblocks.reduce(
			(total, item) => total + item.duration,
			0
		);
		const totalMinutes = Math.round((totalSeconds / 60) * 10) / 10; // Round to 1 decimal place

		const statsElement = document.querySelector(".recentStats");
		statsElement.textContent = `${recentUnblocks.length} unblocks (${totalMinutes} mins) in the last hour`;
	});
}

function setupHistoryModal() {
	const viewHistoryBtn = document.querySelector(".viewHistoryBtn");
	const modal = document.querySelector(".historyModal");
	const closeModal = document.querySelector(".closeModal");

	viewHistoryBtn.addEventListener("click", () => {
		showHistory();
		modal.classList.add("active");
	});

	closeModal.addEventListener("click", () => {
		modal.classList.remove("active");
	});

	// Close modal when clicking outside
	modal.addEventListener("click", (e) => {
		if (e.target === modal) {
			modal.classList.remove("active");
		}
	});
}

function showHistory() {
	chrome.storage.local.get(["unblockHistory"], function (result) {
		const history = result.unblockHistory || [];
		const historyItems = document.querySelector(".historyItems");
		historyItems.innerHTML = "";

		// Sort history by timestamp, most recent first
		history
			.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
			.forEach((item) => {
				const historyItem = document.createElement("div");
				historyItem.className = "historyItem";

				// Format the duration in a readable way
				const duration =
					item.duration >= 3600
						? `${item.duration / 3600} hour(s)`
						: item.duration >= 60
						? `${item.duration / 60} minute(s)`
						: `${item.duration} seconds`;

				// Format the date in a cleaner way
				const date = new Date(item.timestamp);
				const formattedDate = date.toLocaleDateString("en-US", {
					year: "numeric",
					month: "short",
					day: "numeric",
					hour: "2-digit",
					minute: "2-digit",
					hour12: true,
				});

				historyItem.innerHTML = `
				<div class="historyUrl">${item.url}</div>
				<div class="historyNote">${item.note}</div>
				<div class="historyTime">
					${formattedDate} | ${duration}
				</div>
			`;

				historyItems.appendChild(historyItem);
			});

		if (history.length === 0) {
			historyItems.innerHTML = `
				<div style="text-align: center; padding: 20px; color: #757575;">
					No history yet
				</div>
			`;
		}
	});
}
