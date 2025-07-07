let translationActive = false;

// Set the Google Translation API endpoint and your API keys
const GOOGLE_TRANSLATE_API_URL = 'https://translation.googleapis.com/language/translate/v2';
const GOOGLE_SPEECH_TO_TEXT_API_URL = 'https://speech.googleapis.com/v1/speech:recognize';
const API_KEY_TRANSLATE = 'AIzaSyCUPyaew38-7prMs799Y4BZYSBLfb__m6A'; // Your Translation API key
const API_KEY_SPEECH = 'AIzaSyCQVk4NXf_E1ynGYFinstaYkY-anRW7ofY'; // Your Speech-to-Text API key

// Function to add a translation item to the sidebar
function addTranslationItem(original, translated) {
    const item = document.createElement('div');
    item.classList.add('translationItem');

    const originalText = document.createElement('div');
    originalText.className = 'originalText';
    originalText.style.color = '#ccc';
    originalText.textContent = original; // Use textContent for safety

    const translatedText = document.createElement('div');
    translatedText.className = 'translatedText';
    translatedText.style.color = '#3cfe28';
    translatedText.textContent = translated; // Use textContent for safety

    // Append the text elements to the item div
    item.appendChild(originalText);
    item.appendChild(translatedText);

    // Add the item to the sidebar
    const sidebar = document.getElementById('translationSidebar');
    sidebar.appendChild(item);

    // Scroll to the bottom of the sidebar
    sidebar.scrollTop = sidebar.scrollHeight;
}

// Function to translate text using Google Translate API
async function translateText(text, targetLang = 'vi') {
    try {
        console.log("Sending text for translation:", text);

        const response = await fetch(GOOGLE_TRANSLATE_API_URL + `?key=${API_KEY_TRANSLATE}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                q: text,
                target: targetLang,
            })
        });

        // Parse the response
        const data = await response.json();
        console.log("Translation API full response:", data);

        // Check if translatedText is in the response data
        if (data.data && data.data.translations[0].translatedText) {
            addTranslationItem(text, data.data.translations[0].translatedText);
        } else if (data.error) {
            // Handle API error message if present
            console.error("API returned an error:", data.error);
            addTranslationItem(text, `[Translation failed: ${data.error.message || "Unknown error"}]`);
        } else {
            console.error("Unexpected response format. Response data:", data);
            addTranslationItem(text, "[Translation failed: Unexpected format]");
        }
    } catch (error) {
        console.error('Translation Error:', error);
        addTranslationItem(text, "[Translation failed: Error encountered]");
    }
}

// Function to transcribe audio using Google Speech-to-Text API
async function transcribeAudio(audioBlob) {
    try {
        const reader = new FileReader();
        reader.readAsArrayBuffer(audioBlob);
        reader.onload = async () => {
            const audioBytes = reader.result;

            const response = await fetch(GOOGLE_SPEECH_TO_TEXT_API_URL + `?key=${API_KEY_SPEECH}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    config: {
                        encoding: 'LINEAR16', // Adjust encoding as necessary
                        sampleRateHertz: 16000, // Adjust sample rate
                        languageCode: 'en-US', // Change this if needed
                    },
                    audio: {
                        content: btoa(String.fromCharCode(...new Uint8Array(audioBytes))), // Convert binary data to base64
                    },
                })
            });

            const data = await response.json();
            console.log("Speech-to-Text API full response:", data);

            if (data.results && data.results.length > 0) {
                const transcription = data.results.map(result => result.alternatives[0].transcript).join(' ');
                console.log("Transcription result:", transcription);
                translateText(transcription, 'vi'); // Translate the transcribed text
            } else {
                console.error("No transcription results.");
                addTranslationItem("Audio", "[Transcription failed: No results]");
            }
        };
    } catch (error) {
        console.error('Transcription Error:', error);
        addTranslationItem("Audio", "[Transcription failed: Error encountered]");
    }
}

// Function to monitor text nodes on the page for translation
function monitorPageText() {
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.TEXT_NODE && node.nodeValue.trim()) {
                        console.log("Detected new text node:", node.nodeValue);
                        translateText(node.nodeValue.trim(), 'vi');
                    } else if (node.nodeType === Node.ELEMENT_NODE) {
                        // If it's an element, check for child text nodes
                        node.childNodes.forEach(child => {
                            if (child.nodeType === Node.TEXT_NODE && child.nodeValue.trim()) {
                                console.log("Detected new text node from element:", child.nodeValue);
                                translateText(child.nodeValue.trim(), 'vi');
                            }
                        });
                    }
                }
            }
        }
    });
    // Observe the entire document body for text changes
    observer.observe(document.body, { childList: true, subtree: true });
}

// Function to capture audio from the video
async function captureAudioFromVideo() {
    const videoElement = document.querySelector('video'); // Select the video element
    if (!videoElement) {
        console.error("No video element found.");
        return null;
    }

    // Create an audio context and media stream source
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const mediaStream = videoElement.captureStream();
    const source = audioContext.createMediaStreamSource(mediaStream);

    // Create a recorder
    const recorder = new MediaRecorder(mediaStream);
    const audioChunks = [];

    recorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
    };

    recorder.start();

    // Stop recording after a specified time (e.g., 10 seconds)
    setTimeout(() => {
        recorder.stop();
    }, 10000); // Change duration as needed

    // Wait for the recording to finish
    await new Promise(resolve => recorder.onstop = resolve);

    // Create a Blob from the recorded audio chunks
    return new Blob(audioChunks, { type: 'audio/wav' });
}

// Injects the translation sidebar and buttons into the document
function injectUI() {
    if (!document.getElementById('translationSidebar')) {
        const sidebar = document.createElement('div');
        sidebar.id = 'translationSidebar';
        sidebar.style.position = 'fixed';
        sidebar.style.top = '0';
        sidebar.style.right = '0';
        sidebar.style.width = '300px';
        sidebar.style.height = '100%';
        sidebar.style.backgroundColor = '#111';
        sidebar.style.color = '#fff';
        sidebar.style.overflowY = 'auto';
        sidebar.style.padding = '10px';
        sidebar.style.fontSize = '14px';
        sidebar.style.zIndex = '10000';
        document.body.appendChild(sidebar);
    }

    // Create Back button
    if (!document.getElementById('backButton')) {
        const backButton = document.createElement('button');
        backButton.id = 'backButton';
        backButton.innerText = 'Back to Google';
        backButton.style.position = 'fixed';
        backButton.style.top = '20px';
        backButton.style.left = '20px';
        backButton.style.padding = '10px';
        backButton.style.backgroundColor = '#FF5733'; // Change color as needed
        backButton.style.color = '#fff';
        backButton.style.border = 'none';
        backButton.style.borderRadius = '5px';
        backButton.style.cursor = 'pointer';
        backButton.style.zIndex = '10001';
        backButton.addEventListener('click', () => {
            window.location.href = 'https://www.google.com'; // Navigate back to Google
        });
        document.body.appendChild(backButton);
    }

    if (!document.getElementById('startTranslateBtn')) {
        const button = document.createElement('button');
        button.id = 'startTranslateBtn';
        button.innerText = 'Start Translation';
        button.style.position = 'fixed';
        button.style.top = '60px'; // Adjusted position to avoid overlap with back button
        button.style.left = '20px';
        button.style.padding = '10px';
        button.style.backgroundColor = '#4CAF50';
        button.style.color = '#fff';
        button.style.border = 'none';
        button.style.borderRadius = '5px';
        button.style.cursor = 'pointer';
        button.style.zIndex = '10001';
        button.addEventListener('click', async () => {
            translationActive = !translationActive;
            button.innerText = translationActive ? "Translation Active" : "Start Translation";
            button.style.backgroundColor = translationActive ? '#FF5733' : '#4CAF50';

            if (translationActive) {
                console.log("Translation activated. Monitoring page for text changes...");
                monitorPageText();

                // Start capturing audio from the video
                const audioBlob = await captureAudioFromVideo(); // Capture audio
                if (audioBlob) {
                    transcribeAudio(audioBlob);
                }
            } else {
                console.log("Translation deactivated.");
            }
        });
        document.body.appendChild(button);
    }
}

// Wait until the DOM is fully loaded before injecting UI elements
window.addEventListener('DOMContentLoaded', () => {
    console.log("preload.js loaded! Injecting UI elements...");
    injectUI();
});
