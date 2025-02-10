async function getIconFiles() {
	return new Promise((resolve) => {
		chrome.runtime.getPackageDirectoryEntry((root) => {
			root.getDirectory(
				"icons",
				{},
				(iconsDir) => {
					iconsDir.createReader().readEntries((entries) => {
						const imageFiles = entries
							.filter(
								(entry) =>
									entry.isFile && /\.(png|jpg|jpeg|gif|webp)$/i.test(entry.name)
							)
							.map((entry) => "icons/" + entry.name);
						resolve(imageFiles);
					});
				},
				(error) => {
					resolve([]);
				}
			);
		});
	});
}

function handleImageError(img) {
	img.src = chrome.runtime.getURL("icon.png");
}

async function setRandomIcon() {
	try {
		const icons = await getIconFiles();
		if (icons.length > 0) {
			const randomIndex = Math.floor(Math.random() * icons.length);
			const iconElement = document.getElementById("randomIcon");
			const iconUrl = chrome.runtime.getURL(icons[randomIndex]);
			iconElement.src = iconUrl;
		} else {
			document.getElementById("randomIcon").src =
				chrome.runtime.getURL("icon.png");
		}
	} catch (error) {
		// Error handling remains silent
	}
}

document.addEventListener("DOMContentLoaded", setRandomIcon);
