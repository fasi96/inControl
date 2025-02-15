// Initialize the page when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
	initializeDropZone();
	loadImages();
	initializeUploadButton();
});

// Initialize upload button
function initializeUploadButton() {
	const uploadButton = document.getElementById("uploadButton");
	if (uploadButton) {
		uploadButton.addEventListener("click", () => {
			document.getElementById("fileInput").click();
		});
	}
}

// Initialize drag and drop functionality
function initializeDropZone() {
	const dropZone = document.getElementById("dropZone");
	const fileInput = document.getElementById("fileInput");

	// Handle drag and drop events
	dropZone.addEventListener("dragover", (e) => {
		e.preventDefault();
		dropZone.classList.add("drag-over");
	});

	dropZone.addEventListener("dragleave", () => {
		dropZone.classList.remove("drag-over");
	});

	dropZone.addEventListener("drop", (e) => {
		e.preventDefault();
		dropZone.classList.remove("drag-over");
		handleFiles(e.dataTransfer.files);
	});

	// Handle file input change
	fileInput.addEventListener("change", (e) => {
		handleFiles(e.target.files);
	});
}

// Handle file upload
async function handleFiles(files) {
	const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
	const validFiles = Array.from(files).filter((file) =>
		validTypes.includes(file.type)
	);

	if (validFiles.length === 0) {
		alert("Please upload valid image files (PNG, JPG, GIF, WebP)");
		return;
	}

	for (const file of validFiles) {
		try {
			await saveImage(file);
		} catch (error) {
			console.error("Error saving image:", error);
			alert(`Failed to save ${file.name}`);
		}
	}

	// Reload images after upload
	loadImages();
}

// Save image to extension storage
async function saveImage(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();

		reader.onload = async () => {
			try {
				// Get current images
				const result = await chrome.storage.local.get("blockMemes");
				const blockMemes = result.blockMemes || [];

				// Add new image
				blockMemes.push({
					id: Date.now().toString(),
					name: file.name,
					data: reader.result,
				});

				// Save updated images
				await chrome.storage.local.set({ blockMemes });
				resolve();
			} catch (error) {
				reject(error);
			}
		};

		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(file);
	});
}

// Load and display images
async function loadImages() {
	const imagesGrid = document.getElementById("imagesGrid");
	imagesGrid.innerHTML = "";

	try {
		const result = await chrome.storage.local.get("blockMemes");
		const blockMemes = result.blockMemes || [];

		if (blockMemes.length === 0) {
			imagesGrid.innerHTML = `
                <div class="empty-state">
                    No images uploaded yet. Add some memes to make blocking more fun!
                </div>
            `;
			return;
		}

		blockMemes.forEach((meme) => {
			const imageItem = document.createElement("div");
			imageItem.className = "image-item";
			imageItem.innerHTML = `
                <img src="${meme.data}" alt="${meme.name}" title="${meme.name}">
                <button class="delete-button" data-id="${meme.id}">&times;</button>
            `;

			// Add delete handler
			const deleteButton = imageItem.querySelector(".delete-button");
			deleteButton.addEventListener("click", () => deleteImage(meme.id));

			imagesGrid.appendChild(imageItem);
		});
	} catch (error) {
		console.error("Error loading images:", error);
		imagesGrid.innerHTML = `
            <div class="empty-state">
                Error loading images. Please try again.
            </div>
        `;
	}
}

// Delete an image
async function deleteImage(id) {
	if (!confirm("Are you sure you want to delete this image?")) {
		return;
	}

	try {
		const result = await chrome.storage.local.get("blockMemes");
		const blockMemes = result.blockMemes || [];

		// Remove the image with the matching id
		const updatedMemes = blockMemes.filter((meme) => meme.id !== id);

		// Save updated images
		await chrome.storage.local.set({ blockMemes: updatedMemes });

		// Reload images
		loadImages();
	} catch (error) {
		console.error("Error deleting image:", error);
		alert("Failed to delete image");
	}
}
