// app.js - Incorporates Autoplay Toggle, Full Upcoming List, and new Title Element

// --- DOM Element References ---
const videoPlayerElement = document.getElementById('my-video-player');
const nextButton = document.getElementById('nextButton');
const prevButton = document.getElementById('prevButton');
const currentVideoTitleElement = document.getElementById('currentVideoTitleSidebar');
const upcomingListElement = document.getElementById('upcomingList');
const shuffleButton = document.getElementById('shuffleButton');
const autoplayToggleButton = document.getElementById('autoplayToggleButton'); // New button
const datasetButtons = document.querySelectorAll('.dataset-button');

// --- Global Variables ---
let videoList = [];
let currentVideoIndex = -1;
let player = null; // Video.js player instance
let currentDatasetFile = 'videos_day.json'; // Default dataset
let isAutoplayEnabled = true; // Autoplay for 'ended' event is ON by default

// --- UI State Functions ---
function showLoadingState(message = "Loading...") {
    currentVideoTitleElement.innerHTML = `<span>${message}</span>`; // Use span to avoid parsing as HTML
    upcomingListElement.innerHTML = '<li>Loading...</li>';
    nextButton.disabled = true;
    prevButton.disabled = true;
    shuffleButton.disabled = true;
    autoplayToggleButton.disabled = true;
    datasetButtons.forEach(button => button.disabled = true);
}

function enableCoreControls() {
    const hasVideos = videoList && videoList.length > 0;
    shuffleButton.disabled = !(hasVideos && videoList.length > 1);
    autoplayToggleButton.disabled = !hasVideos;
    datasetButtons.forEach(button => button.disabled = false);
    // Next/Prev button state is handled in loadVideoIntoPlayer
}

function updateAutoplayButton() {
    if (isAutoplayEnabled) {
        autoplayToggleButton.textContent = 'Auto-play ON';
        autoplayToggleButton.classList.add('autoplay-on');
        autoplayToggleButton.classList.remove('autoplay-off');
    } else {
        autoplayToggleButton.textContent = 'Auto-play OFF';
        autoplayToggleButton.classList.add('autoplay-off');
        autoplayToggleButton.classList.remove('autoplay-on');
    }
}

// --- Core Logic ---
/**
 * Shuffles the currently active videoList array in place.
 */
function shuffleVideoList() {
    if (!videoList || videoList.length < 2) {
        console.log("Not enough videos to shuffle.");
        return;
    }
    console.log("Shuffling current video list...");
    for (let i = videoList.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [videoList[i], videoList[j]] = [videoList[j], videoList[i]];
    }
    console.log("List shuffled.");
    loadVideoIntoPlayer(0);
    shuffleButton.textContent = 'Shuffled!';
    setTimeout(() => { shuffleButton.textContent = 'Shuffle List'; }, 1200);
}

/**
 * Updates the display of the upcoming video list to show ALL remaining videos.
 */
function updateUpcomingList() {
    upcomingListElement.innerHTML = '';
    if (!videoList || videoList.length === 0) return;

    const startIndex = currentVideoIndex + 1;
    // Loop through ALL remaining videos
    if (startIndex >= videoList.length) {
        upcomingListElement.innerHTML = '<li>End of list.</li>';
        return;
    }

    for (let i = startIndex; i < videoList.length; i++) {
        const upcomingIndex = i; // Current index in the main videoList
        const videoData = videoList[upcomingIndex];
        const listItem = document.createElement('li');
        const linkButton = document.createElement('button');
        linkButton.className = 'upcoming-link';
        linkButton.dataset.index = upcomingIndex;

        const titleSpan = document.createElement('span');
        titleSpan.className = 'upcoming-title';
        titleSpan.textContent = `${videoData.title.substring(0, 50)}${videoData.title.length > 50 ? '...' : ''}`;

        const scoreSpan = document.createElement('span');
        scoreSpan.className = 'upcoming-score';
        scoreSpan.textContent = `(Score: ${videoData.score})`;

        linkButton.appendChild(titleSpan);
        linkButton.appendChild(scoreSpan);
        linkButton.title = videoData.title;

        linkButton.addEventListener('click', (event) => {
            const indexToLoad = parseInt(event.currentTarget.dataset.index, 10);
            if (!isNaN(indexToLoad)) {
                loadVideoIntoPlayer(indexToLoad);
            }
        });
        listItem.appendChild(linkButton);
        upcomingListElement.appendChild(listItem);
    }
}

/**
 * Initializes the Video.js player instance if it doesn't exist
 * and sets up essential event listeners.
 */
function initializeVideoJsPlayer() {
    if (!player) {
        const playerOptions = {
            fluid: true,
            autoplay: true, // Video.js will attempt to autoplay if browser allows (usually needs muted)
            muted: true,    // Start muted
            controls: true,
        };
        player = videojs(videoPlayerElement.id, playerOptions, function onPlayerReady() {
            videojs.log('Video.js Player is ready.');
            this.on('ended', () => {
                console.log('Video ended via Video.js.');
                if (isAutoplayEnabled) { // Check autoplay toggle
                    console.log('Autoplay is ON, loading next video.');
                    playNextVideo();
                } else {
                    console.log('Autoplay is OFF, not loading next video automatically.');
                    // Optionally, you could advance the index but not play,
                    // or provide a "Play Next" prompt. For now, just stops.
                }
            });
            this.on('error', () => {
                const error = this.error();
                console.error('Video.js Player Error:', error);
                handlePlaybackError(`Player Error: Code ${error?.code}, ${error?.message}`);
            });
        });
    } else {
        player.reset();
    }
}

/**
 * Loads a video from the videoList into the Video.js player.
 * @param {number} index - The index of the video in the videoList.
 */
function loadVideoIntoPlayer(index) {
     if (!videoList || videoList.length === 0 || index < 0 || index >= videoList.length) {
        currentVideoTitleElement.innerHTML = `<span>End of list or invalid index.</span>`;
        console.warn(`Attempted to load invalid index: ${index}`);
        prevButton.disabled = (index <= 0 || videoList.length === 0);
        nextButton.disabled = (index >= videoList.length - 1 || videoList.length === 0);
        if (player) player.reset();
        updateUpcomingList();
        return;
    }

    currentVideoIndex = index;
    const videoData = videoList[currentVideoIndex];

    currentVideoTitleElement.innerHTML = `
        <a href="${videoData.permalink}" target="_blank" title="Go to Reddit Post: ${videoData.title}">
            ${videoData.title}
        </a>`;
    console.log(`Loading into player [${index + 1}/${videoList.length}]: ${videoData.title} (${videoData.type})`);

    if (!player) {
        console.error("Video.js player not initialized. Initializing now.");
        initializeVideoJsPlayer();
        if (!player) {
            currentVideoTitleElement.innerHTML = "<span>Error: Player could not be initialized.</span>";
            return;
        }
    }
    
    let sourceType;
    switch (videoData.type.toLowerCase()) {
        case 'hls': sourceType = 'application/x-mpegURL'; break;
        case 'dash': sourceType = 'application/dash+xml'; break;
        default: sourceType = videoData.url.includes('.mp4') ? 'video/mp4' : undefined;
    }

    player.src({ src: videoData.url, type: sourceType });
    player.load();
    player.play()?.catch(error => {
        console.warn("Player play() attempt failed (this is common if browser blocks autoplay despite 'muted'):", error);
        // Video.js often handles this internally, or user might need to click play.
    });

    prevButton.disabled = (currentVideoIndex <= 0);
    nextButton.disabled = (currentVideoIndex >= videoList.length - 1);
    updateUpcomingList();
}

/** Handles errors during playback (called by player's error event) */
function handlePlaybackError(errorMessage) {
    console.error("Playback Error:", errorMessage);
    const currentTitleLink = currentVideoTitleElement.querySelector('a');
    const titleHTML = currentTitleLink ? currentTitleLink.outerHTML : `<span>${videoList[currentVideoIndex]?.title || "Video"}</span>`;
    currentVideoTitleElement.innerHTML = `<span style="color: red;">Playback Error. Skipping...</span><br/>${titleHTML}`;
    setTimeout(playNextVideo, 2500);
}

/** Loads the next video. */
function playNextVideo() {
    if (currentVideoIndex < videoList.length - 1) {
        loadVideoIntoPlayer(currentVideoIndex + 1);
    } else {
        const lastVideoData = videoList[currentVideoIndex];
        currentVideoTitleElement.innerHTML = `End of list. Last: <a href="${lastVideoData?.permalink || '#'}" target="_blank" title="${lastVideoData?.title || ''}">${lastVideoData?.title || 'N/A'}</a>`;
        console.log("End of list reached.");
        nextButton.disabled = true;
    }
}

/** Loads the previous video. */
function playPreviousVideo() {
    if (currentVideoIndex > 0) {
        loadVideoIntoPlayer(currentVideoIndex - 1);
    } else {
         console.log("Beginning of list reached.");
         prevButton.disabled = true;
    }
}

/** Fetches a JSON dataset, updates the video list, and resets the player. */
async function loadAndInitialize(jsonFilename) {
    console.log(`Attempting to load dataset: ${jsonFilename}`);
    const userFriendlyName = jsonFilename.replace('videos_', '').replace('.json', '').replace(/_/g, ' ');
    showLoadingState(`Loading ${userFriendlyName} list...`);

    datasetButtons.forEach(button => {
        button.classList.toggle('active-dataset', button.dataset.file === jsonFilename);
        button.disabled = true;
    });

    try {
        const response = await fetch(jsonFilename);
        if (!response.ok) { throw new Error(`HTTP error! Status: ${response.status} for ${jsonFilename}`); }
        const newData = await response.json();

        videoList = newData;
        currentDatasetFile = jsonFilename;
        console.log(`Loaded ${videoList.length} videos from ${jsonFilename}`);

        if (!player) { initializeVideoJsPlayer(); }
        else { player.reset(); }
        
        if (videoList && videoList.length > 0) {
            loadVideoIntoPlayer(0);
        } else {
            currentVideoTitleElement.innerHTML = `<span>No videos found in ${userFriendlyName}. Run Python script.</span>`;
            upcomingListElement.innerHTML = '';
            if (player) player.reset();
        }
    } catch (error) {
        console.error(`Failed to load dataset ${jsonFilename}:`, error);
        currentVideoTitleElement.innerHTML = `<span>Error loading ${userFriendlyName}: ${error.message}.</span>`;
        upcomingListElement.innerHTML = '<li>Error loading list.</li>';
        if (player) player.reset();
    } finally {
        enableCoreControls();
    }
}

// --- Event Listeners Setup ---
nextButton.addEventListener('click', playNextVideo);
prevButton.addEventListener('click', playPreviousVideo);
shuffleButton.addEventListener('click', shuffleVideoList);

autoplayToggleButton.addEventListener('click', () => {
    isAutoplayEnabled = !isAutoplayEnabled;
    updateAutoplayButton();
    console.log(`Autoplay is now ${isAutoplayEnabled ? 'ON' : 'OFF'}`);
});

datasetButtons.forEach(button => {
    button.addEventListener('click', () => {
        const fileToLoad = button.dataset.file;
        if (fileToLoad && currentDatasetFile !== fileToLoad) {
            loadAndInitialize(fileToLoad);
        } else if (!fileToLoad) {
             console.error("Button is missing data-file attribute:", button);
        }
    });
});

// --- Initial Application Start ---
document.addEventListener('DOMContentLoaded', () => {
    updateAutoplayButton(); // Set initial state of autoplay button text/class
    loadAndInitialize(currentDatasetFile); // Load default dataset
});