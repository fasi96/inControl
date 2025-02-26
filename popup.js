document.addEventListener("DOMContentLoaded", function () {
	loadBlockedUrls();
	updateStats();
	setupHistoryModal();
	setupMemeManager();

	document.getElementById("addBtn").addEventListener("click", addUrl);
	document
		.getElementById("urlInput")
		.addEventListener("keypress", function (e) {
			if (e.key === "Enter") addUrl();
		});

	updateAllProgressBars();
});

function addUrl() {
	const input = document.getElementById("urlInput");
	const url = input.value.trim().toLowerCase();
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
			// Don't do anything if button is in progress (has active unblock period)
			if (unblockBtn.classList.contains("in-progress")) {
				return;
			}

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

async function handleUnblockRequest(
	url,
	timeSelect,
	noteInput,
	unblockSection
) {
	const duration = parseInt(timeSelect.value);
	const expiryTime = Date.now() + duration * 1000;

	const request = {
		url: url,
		duration: duration,
		note: noteInput.value.trim(),
		timestamp: new Date().toISOString(),
		expiryTime: expiryTime,
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

			// Create or get Block Now button
			let blockNowBtn = item.querySelector(".blockNowBtn");
			if (!blockNowBtn) {
				blockNowBtn = document.createElement("button");
				blockNowBtn.className = "blockNowBtn";
				blockNowBtn.textContent = "Block Now";
				blockNowBtn.onclick = () => {
					// Send message to background script to clear temporary access
					chrome.runtime.sendMessage(
						{ type: "clearTemporaryAccess", url: url },
						(response) => {
							if (response.success) {
								// Reset the unblock button
								resetButton(unblockBtn, buttonText, progressBar);
								// Hide the Block Now button
								blockNowBtn.classList.remove("visible");
							}
						}
					);
				};
				item.querySelector(".urlControls").appendChild(blockNowBtn);
			}

			const currentTime = Date.now();
			const remainingTime = Math.max(
				0,
				Math.ceil((expiryTime - currentTime) / 1000)
			);
			const elapsedTime = duration - remainingTime;

			if (remainingTime > 0) {
				// Show Block Now button
				blockNowBtn.classList.add("visible");

				// Calculate progress percentage based on remaining time
				const progressPercentage = (elapsedTime / duration) * 100;

				console.log(`Progress update for ${url}:`, {
					remainingTime,
					elapsedTime,
					duration,
					progressPercentage,
					currentTime: new Date(currentTime).toISOString(),
					expiryTime: new Date(expiryTime).toISOString(),
				});

				startProgressBar(
					unblockBtn,
					progressBar,
					buttonText,
					remainingTime,
					duration,
					expiryTime
				);
			} else {
				resetButton(unblockBtn, buttonText, progressBar);
				// Hide Block Now button
				blockNowBtn.classList.remove("visible");
			}
		}
	});
}

function formatTimeRemaining(seconds) {
	if (seconds < 60) {
		return `${seconds}s`;
	}
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	return `${minutes}m ${remainingSeconds}s`;
}

function startProgressBar(
	button,
	progressBar,
	buttonText,
	remainingTime,
	totalDuration,
	expiryTime
) {
	const updateProgress = () => {
		const currentTime = Date.now();
		const remaining = Math.max(0, Math.ceil((expiryTime - currentTime) / 1000));
		// Calculate progress based on remaining time relative to total duration
		const progress = Math.min(
			100,
			((totalDuration - remaining) / totalDuration) * 100
		);

		// Update progress bar width directly
		progressBar.style.transition = "none";
		progressBar.style.width = `${progress}%`;

		// Update time text
		if (remaining > 0) {
			buttonText.textContent = formatTimeRemaining(remaining);
			button.classList.add("in-progress");
			return true;
		} else {
			resetButton(button, buttonText, progressBar);
			return false;
		}
	};

	// Set initial state
	button.classList.add("in-progress");

	// Update immediately
	updateProgress();

	// Update progress every 100ms for smoother animation
	const progressInterval = setInterval(() => {
		const shouldContinue = updateProgress();
		if (!shouldContinue) {
			clearInterval(progressInterval);
		}
	}, 100);

	// Store the interval ID on the button element so we can clear it if needed
	button.dataset.progressInterval = progressInterval;
}

function resetButton(button, buttonText, progressBar) {
	// Clear any existing interval
	if (button.dataset.progressInterval) {
		clearInterval(button.dataset.progressInterval);
		delete button.dataset.progressInterval;
	}

	button.classList.remove("in-progress");
	buttonText.textContent = "Unblock";
	progressBar.style.transition = "width 0.3s ease-out";
	progressBar.style.width = "0%";
}

// Add a function to periodically update all progress bars
function updateAllProgressBars() {
	chrome.storage.local.get(["temporaryAccess"], function (result) {
		const temporaryAccess = result.temporaryAccess || {};

		Object.entries(temporaryAccess).forEach(([url, access]) => {
			if (access && access.expiryTime > Date.now()) {
				updateUrlItemProgress(url, access.duration, access.expiryTime);
			}
		});
	});
}

// Call updateAllProgressBars periodically
setInterval(updateAllProgressBars, 1000);

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
	const historyFilter = document.getElementById("historyFilter");

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

	// Handle filter changes
	historyFilter.addEventListener("change", showHistory);
}

function showHistory() {
	chrome.storage.local.get(["unblockHistory"], function (result) {
		const history = result.unblockHistory || [];
		const historyItems = document.querySelector(".historyItems");
		historyItems.innerHTML = "";

		// Calculate today's date (midnight)
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		// Calculate start of this week
		const startOfWeek = new Date(today);
		startOfWeek.setDate(today.getDate() - today.getDay());

		// Calculate statistics
		const stats = history.reduce(
			(acc, item) => {
				const itemDate = new Date(item.timestamp);

				// Today's count
				if (itemDate >= today) {
					acc.todayCount++;
				}

				// This week's count
				if (itemDate >= startOfWeek) {
					acc.weekCount++;
				}

				// Add to total duration for average calculation
				acc.totalDuration += item.duration;

				return acc;
			},
			{ todayCount: 0, weekCount: 0, totalDuration: 0 }
		);

		// Update statistics in the UI
		document.getElementById("todayCount").textContent = stats.todayCount;
		document.getElementById("weekCount").textContent = stats.weekCount;

		// Calculate average duration in minutes
		const avgDurationMinutes =
			history.length > 0
				? Math.round(stats.totalDuration / history.length / 60)
				: 0;
		document.getElementById(
			"avgDuration"
		).textContent = `${avgDurationMinutes}m`;

		// Sort history by timestamp, most recent first
		history
			.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
			.forEach((item) => {
				const historyItem = document.createElement("div");
				historyItem.className = "historyItem";

				// Format the duration in a readable way
				const duration =
					item.duration >= 3600
						? `${Math.round((item.duration / 3600) * 10) / 10}h`
						: item.duration >= 60
						? `${Math.round(item.duration / 60)}m`
						: `${item.duration}s`;

				// Format the date
				const date = new Date(item.timestamp);
				const now = new Date();
				let formattedDate;

				if (date.toDateString() === now.toDateString()) {
					formattedDate = `Today at ${date.toLocaleTimeString([], {
						hour: "2-digit",
						minute: "2-digit",
					})}`;
				} else if (
					date.toDateString() === new Date(now - 86400000).toDateString()
				) {
					formattedDate = `Yesterday at ${date.toLocaleTimeString([], {
						hour: "2-digit",
						minute: "2-digit",
					})}`;
				} else {
					formattedDate = date.toLocaleDateString([], {
						month: "short",
						day: "numeric",
						hour: "2-digit",
						minute: "2-digit",
					});
				}

				historyItem.innerHTML = `
					<div class="historyUrl">${item.url}</div>
					<div class="historyNote">${item.note}</div>
					<div class="historyTime">${formattedDate} • ${duration}</div>
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

function setupMemeManager() {
	const manageMemeBtn = document.querySelector(".manageMemeBtn");
	if (manageMemeBtn) {
		manageMemeBtn.addEventListener("click", () => {
			window.open(chrome.runtime.getURL("blocked.html"));
		});
	}
}
