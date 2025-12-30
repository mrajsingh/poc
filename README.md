# AI GENEATED CODE

# Magic Storyteller ✨

A magical web application that brings children's stories to life! As you narrate a story, the app listens to your voice, automatically generates beautiful illustrations for each scene, and compiles them into a downloadable movie with subtitles.

## 🚀 Features

*   **Voice-to-Text Magic**: Simply speak, and your story appears on the screen.
*   **Real-time Illustration**: Uses AI (Pollinations.ai) to generate vibrant, kid-friendly images for every scene.
*   **Smart Auto-Generation**: Automatically detects new scenes when you pause narration or speak enough words.
*   **Manual Control**: Edit text fixes or manually trigger scene generation anytime.
*   **Movie Maker**: One-click export to download an `.mp4` video of your story, complete with burned-in subtitles.
*   **100% Free**: No API keys, credits, or login required.

## 🛠️ Prerequisites

*   **Node.js**: Version 14.x or higher (Tested on v12+).
*   **Browser**: A modern browser (Chrome/Edge/Brave) with Web Speech API support.

## 📦 Installation

1.  Clone this repository or download the source code.
2.  Open your terminal/command prompt in the project folder.
3.  Install dependencies:

```bash
npm install
```

## 🏃‍♂️ How to Run

1.  Start the development server:

```bash
npm run dev
```

2.  Open your browser and navigate to:
    `http://localhost:3000`

3.  **Grant Microphone Permissions**: The app needs access to your microphone to "hear" the story.

## 🎮 How to Use

1.  **Start Talking**: Press the **Microphone** icon (if it's not already red/pulsing) and begin your tale like *"Once upon a time..."*
2.  **Watch the Magic**: 
    -   Images will appear automatically after ~25 words or a 3-second pause.
    -   You can also click **✨ Generate Scene Now** to force a new image immediately.
3.  **Edit**: If the robot heard you wrong, you can click in the text box and fix spelling errors.
4.  **Download**: When your story is finished, click **Download Movie** to save your masterpiece!

## 🔧 Troubleshooting

*   **Images not loading?** 
    -   The app uses a free public API. Occasionally it may be slow or under heavy load. The "Live Scene" box will show a loading status.
*   **Video download fails?**
    -   Ensure you are using a recent version of Chrome or Edge, as the video engine (`ffmpeg.wasm`) relies on modern browser features (`SharedArrayBuffer`).

## 📄 License

This project is intended strictly for **Non-Commercial Educational Use Only**. 
The underlying image generation service (Pollinations.ai) defaults to a free tier which may have its own usage policies. Please do not use this code for commercial products without checking applicable terms.
