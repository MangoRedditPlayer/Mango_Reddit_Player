// app.js - Final version with all UI/UX enhancements

// --- DOM Element References ---
const videoPlayerElement = document.getElementById('my-video-player');
const activeVideoPageTitleElement = document.getElementById('activeVideoPageTitle'); // Main title display

const prevButton = document.getElementById('prevButton');
const nextButton = document.getElementById('nextButton');
const shuffleButton = document.getElementById('shuffleButton');
const autoplayToggleButton = document.getElementById('autoplayToggleButton');
const reverseListButton = document.getElementById('reverseListButton'); // New button

const upcomingListElement = document.getElementById('upcomingList');
const datasetButtons = document.querySelectorAll('.dataset-button');

const privacyLink = document.getElementById('privacyLink');
const privacyPolicyTextElement = document.getElementById('privacyPolicyText');

// --- Global Variables ---
let videoList = [];
let currentVideoIndex = -1;
let player = null; // Video.js player instance
let currentDatasetFile = 'videos_day.json'; // Default dataset
let isAutoplayEnabled = true;

// --- UI State Functions ---
function showLoadingState(message = "Loading...") {
    activeVideoPageTitleElement.innerHTML = `<span>${message}</span>`;
    upcomingListElement.innerHTML = '<li>Loading...</li>';
    [nextButton, prevButton, shuffleButton, autoplayToggleButton, reverseListButton].forEach(btn => btn.disabled = true);
    datasetButtons.forEach(button => button.disabled = true);
}

function enableCoreControls() {
    const hasVideos = videoList && videoList.length > 0;
    shuffleButton.disabled = !(hasVideos && videoList.length > 1);
    autoplayToggleButton.disabled = !hasVideos;
    reverseListButton.disabled = !(hasVideos && videoList.length > 1); // Enable if list can be reversed
    datasetButtons.forEach(button => button.disabled = false);
    // Next/Prev button state is handled in loadVideoIntoPlayer
}

function updateAutoplayButtonUI() {
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
    if (!videoList || videoList.length < 2) { return; }
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
 * Reverses the order of the currently active videoList.
 */
function reverseVideoList() {
    if (!videoList || videoList.length < 2) {
        console.log("Not enough videos to reverse.");
        return;
    }
    console.log("Reversing video list...");
    videoList.reverse();
    console.log("List reversed.");
    loadVideoIntoPlayer(0); // Load the new first video
    // Optional: visual feedback for reverse button
    reverseListButton.textContent = 'Reversed!';
    setTimeout(() => { reverseListButton.textContent = 'Reverse List'; }, 1200);
}


/**
 * Updates the display of the upcoming video list (shows all remaining).
 */
function updateUpcomingList() {
    upcomingListElement.innerHTML = '';
    if (!videoList || videoList.length === 0) {
        shuffleButton.disabled = true; // Also disable shuffle if no list
        reverseListButton.disabled = true; // Disable reverse if no list
        return;
    }
    // Enable shuffle/reverse if list has content (prev/next handled in loadVideo)
    shuffleButton.disabled = videoList.length < 2;
    reverseListButton.disabled = videoList.length < 2;


    const startIndex = currentVideoIndex + 1;
    if (startIndex >= videoList.length) {
        upcomingListElement.innerHTML = '<li>End of list.</li>';
        return;
    }

    for (let i = startIndex; i < videoList.length; i++) {
        const upcomingIndex = i;
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
        linkButton.appendChild(titleSpan); linkButton.appendChild(scoreSpan);
        linkButton.title = videoData.title;
        linkButton.addEventListener('click', (event) => {
            const indexToLoad = parseInt(event.currentTarget.dataset.index, 10);
            if (!isNaN(indexToLoad)) { loadVideoIntoPlayer(indexToLoad); }
        });
        listItem.appendChild(linkButton); upcomingListElement.appendChild(listItem);
    }
}

/**
 * Initializes the Video.js player instance.
 */
function initializeVideoJsPlayer() {
    if (!player) {
        const playerOptions = {
            fluid: true, autoplay: true, muted: true, controls: true,
        };
        player = videojs(videoPlayerElement.id, playerOptions, function onPlayerReady() {
            videojs.log('Video.js Player is ready.');
            this.on('ended', () => {
                console.log('Video ended.');
                if (isAutoplayEnabled) {
                    console.log('Autoplay ON, loading next.');
                    playNextVideo();
                } else {
                    console.log('Autoplay OFF.');
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
 * Loads a video into the Video.js player.
 * @param {number} index - The index of the video in the videoList.
 */
function loadVideoIntoPlayer(index) {
    const noVideoMsg = `<span>End of list or invalid index.</span>`;
    if (!videoList || videoList.length === 0 || index < 0 || index >= videoList.length) {
        activeVideoPageTitleElement.innerHTML = noVideoMsg;
        console.warn(`Attempted to load invalid index: ${index}`);
        const atStart = index <= 0 || videoList.length === 0;
        const atEnd = index >= videoList.length - 1 || videoList.length === 0;
        prevButton.disabled = atStart;
        nextButton.disabled = atEnd;
        if (player) player.reset();
        updateUpcomingList(); // Update list to show "End of list"
        return;
    }

    currentVideoIndex = index;
    const videoData = videoList[currentVideoIndex];

    // Update the main page title display
    activeVideoPageTitleElement.innerHTML = `
        <a href="${videoData.permalink}" target="_blank" title="Go to Reddit Post: ${videoData.title}">
            ${videoData.title}
        </a>`;
    // Scroll the title area to the top if it's scrollable
    activeVideoPageTitleElement.scrollTop = 0;


    console.log(`Loading into player [${index + 1}/${videoList.length}]: ${videoData.title} (${videoData.type})`);

    if (!player) {
        console.error("Player not initialized. Initializing.");
        initializeVideoJsPlayer();
        if (!player) {
            activeVideoPageTitleElement.innerHTML = "<span>Error: Player init failed.</span>";
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
    // Autoplay is handled by Video.js player options now
    // player.play()?.catch(error => console.warn("Player play() failed:", error));

    prevButton.disabled = (currentVideoIndex <= 0);
    nextButton.disabled = (currentVideoIndex >= videoList.length - 1);
    updateUpcomingList();
}

/** Handles errors during playback */
function handlePlaybackError(errorMessage) {
    console.error("Playback Error:", errorMessage);
    const currentTitleLink = activeVideoPageTitleElement.querySelector('a');
    const titleHTML = currentTitleLink ? currentTitleLink.outerHTML : `<span>${videoList[currentVideoIndex]?.title || "Video"}</span>`;
    activeVideoPageTitleElement.innerHTML = `<span style="color: red;">Playback Error. Skipping...</span><br/>${titleHTML}`;
    setTimeout(playNextVideo, 2500);
}

/** Loads the next video. */
function playNextVideo() {
    if (currentVideoIndex < videoList.length - 1) {
        loadVideoIntoPlayer(currentVideoIndex + 1);
    } else {
        const lastVideoData = videoList[currentVideoIndex];
        activeVideoPageTitleElement.innerHTML = `End of list. Last: <a href="${lastVideoData?.permalink || '#'}" target="_blank" title="${lastVideoData?.title || ''}">${lastVideoData?.title || 'N/A'}</a>`;
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
            activeVideoPageTitleElement.innerHTML = `<span>No videos found in ${userFriendlyName}. Run Python script.</span>`;
            upcomingListElement.innerHTML = '';
            if (player) player.reset();
        }
    } catch (error) {
        console.error(`Failed to load dataset ${jsonFilename}:`, error);
        activeVideoPageTitleElement.innerHTML = `<span>Error loading ${userFriendlyName}: ${error.message}.</span>`;
        upcomingListElement.innerHTML = '<li>Error loading list.</li>';
        if (player) player.reset();
    } finally {
        enableCoreControls();
    }
}

/** Toggles the visibility of the privacy policy text. */
function togglePrivacyPolicy() {
    if (privacyPolicyTextElement.style.display === "none" || privacyPolicyTextElement.style.display === "") {
        privacyPolicyTextElement.style.display = "block";
    } else {
        privacyPolicyTextElement.style.display = "none";
    }
}

// --- Event Listeners Setup ---
prevButton.addEventListener('click', playPreviousVideo);
nextButton.addEventListener('click', playNextVideo);
shuffleButton.addEventListener('click', shuffleVideoList);
reverseListButton.addEventListener('click', reverseVideoList); // Listener for new button

autoplayToggleButton.addEventListener('click', () => {
    isAutoplayEnabled = !isAutoplayEnabled;
    updateAutoplayButtonUI();
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

privacyLink.addEventListener('click', (event) => {
    event.preventDefault(); // Prevent default anchor link behavior
    togglePrivacyPolicy();
});

// --- Initial Application Start ---
document.addEventListener('DOMContentLoaded', () => {
    setInitialUIState();
    updateAutoplayButtonUI();
    loadAndInitialize(currentDatasetFile); // Load default dataset
});