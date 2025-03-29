// DOM Elements
const cameraFeed = document.getElementById('camera-feed');
const snapshotCanvas = document.getElementById('snapshot-canvas');
const eventButton = document.getElementById('event-button');
const historyContainer = document.getElementById('history-container');
const currentTimeElement = document.getElementById('current-time');
const notification = document.getElementById('notification');
const notificationText = document.getElementById('notification-text');

// Constants
const CAMERA_NAME = 'Camera 1';
const DASHBOARD_URL = '../dashboard/index.html';
const LOCAL_STORAGE_KEY = 'camera_events';

// Variables
let stream = null;
let events = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initCamera();
    updateCurrentTime();
    loadEvents();
    setInterval(updateCurrentTime, 1000);
});

// Initialize camera
async function initCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'environment' 
            }, 
            audio: false 
        });
        cameraFeed.srcObject = stream;
        showNotification('Camera connected successfully');
    } catch (error) {
        console.error('Error accessing camera:', error);
        showNotification('Error accessing camera. Please check permissions.', true);
    }
}

// Update current time display
function updateCurrentTime() {
    const now = new Date();
    currentTimeElement.textContent = now.toLocaleTimeString();
}

// Take a snapshot from the video feed
function takeSnapshot() {
    const context = snapshotCanvas.getContext('2d');
    
    // Set canvas dimensions to match video
    snapshotCanvas.width = cameraFeed.videoWidth;
    snapshotCanvas.height = cameraFeed.videoHeight;
    
    // Draw the current video frame to the canvas
    context.drawImage(cameraFeed, 0, 0, snapshotCanvas.width, snapshotCanvas.height);
    
    // Convert canvas to data URL (image)
    return snapshotCanvas.toDataURL('image/jpeg', 0.8);
}

// Report an event
eventButton.addEventListener('click', () => {
    if (!stream) {
        showNotification('Camera not available', true);
        return;
    }
    
    const timestamp = new Date();
    const imageData = takeSnapshot();
    
    // Create event object
    const event = {
        id: Date.now(),
        timestamp: timestamp.toISOString(),
        formattedTime: timestamp.toLocaleString(),
        cameraName: CAMERA_NAME,
        imageData: imageData
    };
    
    // Save event locally
    saveEvent(event);
    
    // Add to history
    addEventToHistory(event);
    
    // Send to dashboard
    sendToDashboard(event);
    
    // Show notification
    showNotification('Event reported successfully');
});

// Save event to local storage
function saveEvent(event) {
    events.push(event);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(events));
}

// Load events from local storage
function loadEvents() {
    const storedEvents = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storedEvents) {
        events = JSON.parse(storedEvents);
        events.forEach(event => addEventToHistory(event));
    }
}

// Add event to history display
function addEventToHistory(event) {
    const historyItem = document.createElement('div');
    historyItem.className = 'history-item';
    historyItem.innerHTML = `
        <img src="${event.imageData}" alt="Event at ${event.formattedTime}" class="history-image">
        <div class="history-details">
            <span class="history-timestamp">${event.formattedTime}</span>
            <span class="history-camera">${event.cameraName}</span>
        </div>
    `;
    
    // Add to the beginning of the history
    if (historyContainer.firstChild) {
        historyContainer.insertBefore(historyItem, historyContainer.firstChild);
    } else {
        historyContainer.appendChild(historyItem);
    }
}

// Send event to dashboard
function sendToDashboard(event) {
    // Store in sessionStorage for the dashboard to access
    // This is a simple way to share data between pages
    const dashboardEvents = JSON.parse(sessionStorage.getItem('dashboard_events') || '[]');
    dashboardEvents.push(event);
    sessionStorage.setItem('dashboard_events', JSON.stringify(dashboardEvents));
    
    // If you want to open the dashboard automatically:
    // window.open(DASHBOARD_URL, '_blank');
}

// Show notification
function showNotification(message, isError = false) {
    notificationText.textContent = message;
    notification.style.backgroundColor = isError ? 'rgba(220, 53, 69, 0.9)' : 'rgba(0, 0, 0, 0.8)';
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}
