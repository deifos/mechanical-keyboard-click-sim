let audioContext;
let clickBuffer;
let isAudioInitialized = false;
let isSoundEnabled = true;
const VOLUME = 1.0; // Adjust this value between 0.0 and 1.0 for volume control

// Listen for toggle messages from popup
chrome.runtime.onMessage.addListener((message) => {
  if ('enabled' in message) {
    isSoundEnabled = message.enabled;
    console.log('Sound ' + (isSoundEnabled ? 'enabled' : 'disabled'));
  }
});

// Load initial state
chrome.storage.sync.get(['enabled'], (result) => {
  isSoundEnabled = result.enabled !== false; // Default to true if not set
});

async function initAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
  }
  return audioContext;
}

async function tryInitAudio(event) {
  // Only initialize on actual user interaction, not on script-triggered events
  if (event && !event.isTrusted) return;

  try {
    if (!audioContext) {
      await initAudioContext();
    }
    
    if (!clickBuffer) {
      await loadClickSound();
    }
    
    isAudioInitialized = true;
    console.log('Audio context initialized successfully');
    
    // Remove the initialization listeners since we're now initialized
    document.removeEventListener('click', tryInitAudio);
    document.removeEventListener('keydown', tryInitAudio);
    
    // If this was triggered by a keydown, play the sound for this key
    if (event && event.type === 'keydown') {
      playClickSound(event);
    }
  } catch (error) {
    console.error('Failed to initialize audio context:', error);
    isAudioInitialized = false;
  }
}

async function loadClickSound() {
  const soundUrl = chrome.runtime.getURL('click.mp3');
  console.log('Loading sound from:', soundUrl);
  
  try {
    const response = await fetch(soundUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    console.log('Sound file loaded, decoding...');
    clickBuffer = await audioContext.decodeAudioData(arrayBuffer);
    console.log('Sound decoded successfully');
    
    // Only add the keydown listener after sound is loaded
    if (!isAudioInitialized) {
      document.addEventListener('keydown', playClickSound);
    }
  } catch (error) {
    console.error('Error in sound loading process:', error);
    throw error;
  }
}

function playClickSound(event) {
  // Don't play sound if disabled or for modifier keys
  if (!isSoundEnabled || event.ctrlKey || event.altKey || event.metaKey) {
    return;
  }

  // If not initialized, try to initialize first
  if (!isAudioInitialized) {
    tryInitAudio(event);
    return;
  }

  try {
    playSound();
  } catch (error) {
    console.error('Error playing click sound:', error);
    // If there's an error, mark as uninitialized and try to reinitialize
    isAudioInitialized = false;
    tryInitAudio(event);
  }
}

function playSound() {
  if (!audioContext || !clickBuffer) {
    console.error('Audio not properly initialized');
    return;
  }

  // Check if context is suspended and resume it
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

  const source = audioContext.createBufferSource();
  const gainNode = audioContext.createGain();
  
  source.buffer = clickBuffer;
  gainNode.gain.value = VOLUME;
  
  source.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  source.start(0);
}

// Add initialization listeners for user interaction
document.addEventListener('click', tryInitAudio);
document.addEventListener('keydown', tryInitAudio);

// Log when keys are pressed to verify the event listener is working
document.addEventListener('keydown', () => {
  console.log('Key pressed');
});
