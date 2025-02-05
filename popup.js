document.addEventListener("DOMContentLoaded", function () {
	loadBlockedUrls();
	updateTempAccessButton();

	document.getElementById("addBtn").addEventListener("click", addUrl);
	document
		.getElementById("urlInput")
		.addEventListener("keypress", function (e) {
			if (e.key === "Enter") addUrl();
		});

	document
		.getElementById("tempAccessBtn")
		.addEventListener("click", enableTemporaryAccess);
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
	urls.forEach((url) => {
		const div = document.createElement("div");
		div.className = "urlItem";

		const text = document.createElement("span");
		text.textContent = url;

		const deleteBtn = document.createElement("span");
		deleteBtn.textContent = " ×";
		deleteBtn.className = "deleteBtn";
		deleteBtn.onclick = () => removeUrl(url);

		div.appendChild(text);
		div.appendChild(deleteBtn);
		urlList.appendChild(div);
	});
}

function removeUrl(urlToRemove) {
	chrome.storage.local.get(["blockedUrls"], function (result) {
		const blockedUrls = result.blockedUrls.filter((url) => url !== urlToRemove);
		chrome.storage.local.set({ blockedUrls: blockedUrls }, function () {
			displayUrls(blockedUrls);
		});
	});
}

function loadBlockedUrls() {
	chrome.storage.local.get(["blockedUrls"], function (result) {
		displayUrls(result.blockedUrls || []);
	});
}

function enableTemporaryAccess() {
	chrome.runtime.sendMessage({ type: "enableTemporaryAccess" }, (response) => {
		if (response.success) {
			const button = document.getElementById("tempAccessBtn");
			button.disabled = true;
			button.textContent = "Access Granted (30s)";

			setTimeout(() => {
				updateTempAccessButton();
			}, 30000);
		}
	});
}

function updateTempAccessButton() {
	chrome.runtime.sendMessage(
		{ type: "getTemporaryAccessStatus" },
		(response) => {
			const button = document.getElementById("tempAccessBtn");
			if (response.temporaryAccess) {
				button.disabled = true;
				button.textContent = "Access Granted (30s)";
			} else {
				button.disabled = false;
				button.textContent = "Allow Access for 30 Seconds";
			}
		}
	);
}

chrome.runtime.onMessage.addListener((message) => {
	if (message.type === "temporaryAccessExpired") {
		updateTempAccessButton();
	}
});
