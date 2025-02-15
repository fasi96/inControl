// Array of fun block messages
const blockMessages = [
	"Nope! Stay Focused! 🎯",
	"Not Today, Internet! 🚫",
	"Back to Work, Champ! 💪",
	"Nice Try Though! 😅",
	"Focus Mode: Activated! 🔒",
	"Procrastination Blocked! ⛔",
	"Plot Twist: Get Back to Work! 🎬",
	"Error 404: Distraction Blocked! 🛡️",
	"Mission: Stay Productive! 🚀",
	"Distraction? I Don't Know Her! 💅",
];

// Function to set random block message
function setRandomBlockMessage() {
	const messageElement = document.getElementById("blockMessage");
	const randomIndex = Math.floor(Math.random() * blockMessages.length);
	messageElement.textContent = blockMessages[randomIndex];
}

// Set random message when page loads
document.addEventListener("DOMContentLoaded", setRandomBlockMessage);
