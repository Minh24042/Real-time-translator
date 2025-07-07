const GTranslatorAPI = require('g-translator'); // Ensure GTranslatorAPI is installed and required

// Check if script.js is loaded
console.log("script.js loaded successfully");

// Function to handle text translation
document.getElementById('translateTextBtn').addEventListener('click', async () => {
    const text = document.getElementById('originalText').innerText;
    const targetLang = 'vi'; // Target language (e.g., Vietnamese)

    try {
        console.log("Translating text:", text);

        // Initialize the translator and translate the text
        const translator = new GTranslatorAPI();
        const translatedText = await translator.translate(text, targetLang);

        // Display the translated text in the HTML element
        document.getElementById('translatedText').innerText = translatedText;
        console.log("Translated text:", translatedText);

        // Optional: Send the translation to the Electron main process for additional display handling
        if (window.electron && window.electron.updateTranslationDisplay) {
            window.electron.updateTranslationDisplay(translatedText);
        }
    } catch (error) {
        console.error('Translation error:', error);
        alert('Error translating text: ' + error.message);
    }
});

// Function to handle video translation
document.getElementById('translateVideoBtn').addEventListener('click', async () => {
    const videoFile = document.getElementById('videoFile').files[0];
    const targetLang = 'vi'; // Target language (e.g., Vietnamese)

    if (!videoFile) {
        alert('Please select a video file.');
        return;
    }

    try {
        console.log("Translating video file:", videoFile.name);

        // Step 1: Extract audio from the video file
        const audioBlob = await extractAudioFromVideo(videoFile);

        // Step 2: Transcribe the extracted audio to text
        const transcription = await transcribeAudio(audioBlob);

        // Step 3: Translate the transcribed text
        const translator = new GTranslatorAPI();
        const translatedText = await translator.translate(transcription, targetLang);

        // Display the translated text from the video in the HTML element
        document.getElementById('videoTranslationOutput').innerText = translatedText;
        console.log("Translated video transcription:", translatedText);

        // Optional: Send the translation to the Electron main process for display handling
        if (window.electron && window.electron.updateTranslationDisplay) {
            window.electron.updateTranslationDisplay(translatedText);
        }
    } catch (error) {
        console.error('Video translation error:', error);
        alert('Error translating video: ' + error.message);
    }
});

// Function to extract audio from video (FFmpeg implementation needed)
async function extractAudioFromVideo(videoFile) {
    console.log("Extracting audio from video:", videoFile.name);
    
    // Here you would typically use FFmpeg or another library to extract audio
    // For this example, we assume this function returns an audio blob for now
    return videoFile; // This is just a placeholder
}

// Function to transcribe audio to text using Google Speech-to-Text API
async function transcribeAudio(audioBlob) {
    console.log("Transcribing audio...");

    const reader = new FileReader();
    reader.readAsArrayBuffer(audioBlob);
    return new Promise((resolve, reject) => {
        reader.onload = async () => {
            const audioBytes = reader.result;

            const response = await fetch(GOOGLE_SPEECH_TO_TEXT_API_URL + `?key=${API_KEY_SPEECH}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    config: {
                        encoding: 'LINEAR16', // Adjust encoding as necessary
                        sampleRateHertz: 16000, // Adjust sample rate as needed
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
                resolve(transcription);
            } else {
                console.error("No transcription results.");
                reject(new Error("Transcription failed: No results"));
            }
        };

        reader.onerror = (error) => {
            console.error("Error reading audio file:", error);
            reject(new Error("Error reading audio file: " + error.message));
        };
    });
}

// Function to monitor news articles and translate them
function monitorNewsArticles() {
    const articles = document.querySelectorAll('article, h1, h2, h3, p'); // Select relevant text elements
    articles.forEach(article => {
        const text = article.innerText;
        if (text.trim()) {
            translateText(text, 'vi'); // Translate each article text
        }
    });
}

// Injects the translation sidebar and button into the document
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
                monitorPageText(); // Monitor changes in text nodes

                // Monitor news articles for translation
                monitorNewsArticles(); // Monitor articles for translation

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
