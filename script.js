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
const DASHBOARD_URL = 'https://shreyanssatpute.github.io/dashboard/';
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
    makeHistoryItemsSwipeable();
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
    
    // Make all history items swipeable after loading
    makeHistoryItemsSwipeable();
}

// Add event to history display
function addEventToHistory(event) {
    const historyItem = document.createElement('div');
    historyItem.className = 'history-item';
    historyItem.dataset.id = event.id; // Store the event ID in the DOM element
    historyItem.innerHTML = `
        <img src="${event.imageData}" alt="Event at ${event.formattedTime}" class="history-image">
        <div class="history-details">
            <span class="history-timestamp">${event.formattedTime}</span>
            <span class="history-camera">${event.cameraName}</span>
        </div>
        <div class="delete-indicator">
            <span>Delete</span>
        </div>
    `;
    
    // Add to the beginning of the history
    if (historyContainer.firstChild) {
        historyContainer.insertBefore(historyItem, historyContainer.firstChild);
    } else {
        historyContainer.appendChild(historyItem);
    }
    
    // Make the new item swipeable
    makeHistoryItemSwipeable(historyItem);
}

// Send event to dashboard
function sendToDashboard(event) {
    // Create a simplified version of the event with just essential data
    // to avoid URL size limitations
    const dashboardEvent = {
        id: event.id,
        timestamp: event.timestamp,
        cameraName: event.cameraName,
        imageData: event.imageData
    };
    
    // Store the event in localStorage with a special key that includes the event ID
    localStorage.setItem(`dashboard_event_${event.id}`, JSON.stringify(dashboardEvent));
    
    // Open the dashboard with the event ID as a parameter
    window.open(`${DASHBOARD_URL}?eventId=${event.id}`, '_blank');
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

// Make all history items swipeable
function makeHistoryItemsSwipeable() {
    const historyItems = document.querySelectorAll('.history-item');
    historyItems.forEach(item => makeHistoryItemSwipeable(item));
}

// Make a single history item swipeable
function makeHistoryItemSwipeable(item) {
    let startX, moveX, currentTranslate = 0;
    let isDragging = false;
    
    // Touch events
    item.addEventListener('touchstart', handleTouchStart, { passive: true });
    item.addEventListener('touchmove', handleTouchMove, { passive: false });
    item.addEventListener('touchend', handleTouchEnd);
    
    // Mouse events
    item.addEventListener('mousedown', handleMouseDown);
    
    function handleTouchStart(e) {
        startX = e.touches[0].clientX;
        isDragging = true;
        item.style.transition = 'none';
    }
    
    function handleTouchMove(e) {
        if (!isDragging) return;
        moveX = e.touches[0].clientX;
        const diffX = moveX - startX;
        
        // Only allow swiping left (negative values)
        if (diffX < 0) {
            currentTranslate = diffX;
            item.style.transform = `translateX(${currentTranslate}px)`;
            
            // Show delete indicator when swiped far enough
            if (currentTranslate < -80) {
                item.classList.add('delete-ready');
            } else {
                item.classList.remove('delete-ready');
            }
            
            // Prevent scrolling when swiping
            e.preventDefault();
        }
    }
    
    function handleTouchEnd() {
        isDragging = false;
        item.style.transition = 'transform 0.3s ease';
        
        // If swiped far enough, delete the item
        if (currentTranslate < -100) {
            deleteHistoryItem(item);
        } else {
            // Reset position
            currentTranslate = 0;
            item.style.transform = `translateX(0)`;
            item.classList.remove('delete-ready');
        }
    }
    
    function handleMouseDown(e) {
        startX = e.clientX;
        isDragging = true;
        item.style.transition = 'none';
        
        // Add mouse move and up listeners to document
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        
        e.preventDefault();
    }
    
    function handleMouseMove(e) {
        if (!isDragging) return;
        moveX = e.clientX;
        const diffX = moveX - startX;
        
        // Only allow swiping left (negative values)
        if (diffX < 0) {
            currentTranslate = diffX;
            item.style.transform = `translateX(${currentTranslate}px)`;
            
            // Show delete indicator when swiped far enough
            if (currentTranslate < -80) {
                item.classList.add('delete-ready');
            } else {
                item.classList.remove('delete-ready');
            }
        }
    }
    
    function handleMouseUp() {
        if (!isDragging) return;
        isDragging = false;
        item.style.transition = 'transform 0.3s ease';
        
        // Remove document listeners
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        
        // If swiped far enough, delete the item
        if (currentTranslate < -100) {
            deleteHistoryItem(item);
        } else {
            // Reset position
            currentTranslate = 0;
            item.style.transform = `translateX(0)`;
            item.classList.remove('delete-ready');
        }
    }
}

// Delete a history item
function deleteHistoryItem(item) {
    // Get the event ID from the data attribute
    const eventId = parseInt(item.dataset.id);
    
    // Find and remove the event from the events array
    events = events.filter(event => event.id !== eventId);
    
    // Update local storage
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(events));
    
    // Animate removal
    item.style.height = `${item.offsetHeight}px`;
    item.style.marginBottom = getComputedStyle(item).marginBottom;
    
    // Force a reflow
    item.offsetHeight;
    
    item.style.height = '0';
    item.style.marginBottom = '0';
    item.style.opacity = '0';
    item.style.transform = 'translateX(-100%)';
    
    // Remove from DOM after animation
    setTimeout(() => {
        item.remove();
        showNotification('Event deleted');
    }, 300);
}
