async function getCustomMemes() {
	try {
		const result = await chrome.storage.local.get("blockMemes");
		return result.blockMemes || [];
	} catch (error) {
		console.error("Error loading custom memes:", error);
		return [];
	}
}

async function getIconFiles() {
	// First get custom memes
	const customMemes = await getCustomMemes();

	// Then get default memes from directory
	return new Promise((resolve) => {
		chrome.runtime.getPackageDirectoryEntry((root) => {
			root.getDirectory(
				"block-memes",
				{},
				(iconsDir) => {
					iconsDir.createReader().readEntries((entries) => {
						const defaultMemes = entries
							.filter(
								(entry) =>
									entry.isFile && /\.(png|jpg|jpeg|gif|webp)$/i.test(entry.name)
							)
							.map((entry) => ({
								id: entry.name,
								name: entry.name,
								data: chrome.runtime.getURL("block-memes/" + entry.name),
							}));

						// Combine custom and default memes
						resolve([...customMemes, ...defaultMemes]);
					});
				},
				(error) => {
					// If directory access fails, still return custom memes
					resolve(customMemes);
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
		const memes = await getIconFiles();
		if (memes.length > 0) {
			const randomIndex = Math.floor(Math.random() * memes.length);
			const iconElement = document.getElementById("randomIcon");
			iconElement.src = memes[randomIndex].data;
		} else {
			document.getElementById("randomIcon").src =
				chrome.runtime.getURL("icon.png");
		}
	} catch (error) {
		console.error("Error setting random icon:", error);
		document.getElementById("randomIcon").src =
			chrome.runtime.getURL("icon.png");
	}
}

document.addEventListener("DOMContentLoaded", () => {
	const iconElement = document.getElementById("randomIcon");
	iconElement.addEventListener("error", (e) => handleImageError(e.target));
	setRandomIcon();
});
