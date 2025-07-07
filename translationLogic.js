const { exec } = require('child_process');
const fs = require('fs');
const speech = require('@google-cloud/speech');
const Translator = require('g-translator');
const Tesseract = require('tesseract.js');
const { createCanvas, loadImage } = require('canvas'); // Node Canvas to handle video frames
const ffmpeg = require('fluent-ffmpeg'); // FFmpeg for extracting frames

// Function to extract audio from video using FFmpeg
function extractAudio(videoPath, outputAudioPath) {
    return new Promise((resolve, reject) => {
        const command = `ffmpeg -i "${videoPath}" -q:a 0 -map a "${outputAudioPath}"`;
        exec(command, (error) => {
            if (error) {
                reject(`Error extracting audio: ${error.message}`);
            } else {
                resolve(outputAudioPath);
            }
        });
    });
}

// Function to transcribe audio using Google Cloud Speech-to-Text
async function transcribeAudio(audioPath) {
    try {
        const client = new speech.SpeechClient();
        const file = fs.readFileSync(audioPath);
        const audioBytes = file.toString('base64');

        const request = {
            audio: {
                content: audioBytes,
            },
            config: {
                encoding: 'LINEAR16',
                sampleRateHertz: 16000,
                languageCode: 'en-US',
            },
        };

        const [response] = await client.recognize(request);
        const transcription = response.results
            .map(result => result.alternatives[0].transcript)
            .join('\n');
        return transcription;
    } catch (error) {
        console.error('Error transcribing audio:', error);
        throw error;
    }
}

// Function to translate text using GTranslatorAPI
async function translateText(text, targetLang) {
    try {
        const translator = new Translator();
        const translatedText = await translator.translate(text, targetLang);
        
        console.log('Translation response:', translatedText);

        if (!translatedText || typeof translatedText !== 'string') {
            throw new Error('Translation failed: received an invalid response');
        }

        return translatedText;
    } catch (error) {
        console.error('Error translating text:', error);
        throw error;
    }
}

// Function to translate content from news articles
async function translateArticleContent(targetLang = 'vi') {
    const articles = document.querySelectorAll('article, h1, h2, h3, p, .content'); // Improved selector
    const translations = [];

    for (const article of articles) {
        const text = article.innerText.trim();
        if (text) {
            try {
                console.log("Translating article text:", text); // Debugging output
                const translatedText = await translateText(text, targetLang);
                translations.push(translatedText);
                article.innerText = translatedText; // Update article with translated text
            } catch (error) {
                console.error('Translation error for article:', error);
            }
        }
    }

    return translations.join('\n');
}

// Function to perform OCR on an image and translate the extracted text
async function ocrAndTranslateImage(imagePath, targetLang = 'vi') {
    try {
        const { data: { text } } = await Tesseract.recognize(imagePath, 'eng');
        if (!text) throw new Error('No text found in the image');
        
        const translatedText = await translateText(text, targetLang);
        return translatedText;
    } catch (error) {
        console.error('OCR and translation error:', error);
        throw error;
    }
}

// Function to capture frames from video and translate them in real-time
async function ocrAndTranslateVideoStream(videoPath, targetLang = 'vi', frameInterval = 1) {
    const translations = [];

    return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
            .on('start', () => console.log('Starting video processing...'))
            .on('end', () => {
                const finalTranslation = translations.join('\n');
                console.log('Video processing finished');
                resolve(finalTranslation);
            })
            .on('error', (err) => {
                console.error('Error processing video frames:', err);
                reject(err);
            })
            .outputOptions([
                '-vf', `fps=1/${frameInterval}`, // Capture a frame every `frameInterval` seconds
                '-q:v', '2'
            ])
            .format('image2pipe')
            .pipe()
            .on('data', async (frame) => {
                try {
                    const { data: { text } } = await Tesseract.recognize(frame, 'eng');
                    if (text) {
                        const translatedText = await translateText(text, targetLang);
                        translations.push(translatedText);
                        console.log(`Original: ${text} | Translated: ${translatedText}`);
                    }
                } catch (error) {
                    console.error('Error in OCR or translation for frame:', error);
                }
            });
    });
}

// Exporting all functions
module.exports = {
    extractAudio,
    transcribeAudio,
    translateText,
    translateArticleContent, // Export new function for article translation
    ocrAndTranslateImage,
    ocrAndTranslateVideoStream
};
