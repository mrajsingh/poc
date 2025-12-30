import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { SceneDisplay } from '../components/SceneDisplay';
import { Film } from 'lucide-react';

const StoryRecorder = dynamic(() => import('../components/StoryRecorder').then(m => m.StoryRecorder), { ssr: false });
const VideoExporter = dynamic(() => import('../components/VideoExporter').then(m => m.VideoExporter), { ssr: false });

interface Scene {
    image: string;
    narrative: string;
    id: number;
}

export default function Home() {
    const [scenes, setScenes] = useState<Scene[]>([]);
    const [currentTranscript, setCurrentTranscript] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [lastProcessedLength, setLastProcessedLength] = useState(0);
    const processingRef = React.useRef(false);

    // Auto-process logic: If user stops talking for a bit or text gets long enough?
    // For better control, let's process when the user pauses significantly or manually?
    // Let's implement a "debounce" approach on the transcript.

    // Actually, standard speech APIs return "isFinal" in events. 
    // Our simple recorder just streams text. 
    // Let's add a "Generate Scene" button for manual control or use a heuristic.
    // HEURISTIC: content changed, then 2 seconds of silence -> generate.

    useEffect(() => {
        // FAILSAFE: If transcript was shortened (e.g. user deleted text), 
        // we shouldn't reset to 0 (which causes re-generation of everything).
        // Instead, we just clamp our tracker to the new end.
        if (currentTranscript.length < lastProcessedLength) {
            console.log("Transcript shortened, adjusting tracker.");
            setLastProcessedLength(currentTranscript.length);
            return;
        }

        // 1. WORD COUNT TRIGGER (Immediate)
        const newText = currentTranscript.slice(lastProcessedLength);
        const wordCount = newText.trim().split(/\s+/).filter(w => w.length > 0).length;

        if (wordCount >= 25 && !processingRef.current) {
            console.log("Trigger: Word count reached");
            handleGenerateScene(newText);
            return;
        }

        // 2. PAUSE TRIGGER (Delayed)
        const timer = setTimeout(() => {
            // Check if we have substantial new text (e.g., > 10 chars)
            if (currentTranscript.length > lastProcessedLength + 10 && !processingRef.current) {
                console.log("Trigger: Pause detected");
                if (newText.trim()) {
                    handleGenerateScene(newText);
                }
            }
        }, 3000); // 3 seconds silence

        return () => clearTimeout(timer);
    }, [currentTranscript, lastProcessedLength]); // Removed isProcessing from dependency to avoid re-trigger loops

    const handleGenerateScene = async (text: string) => {
        if (!text.trim() || processingRef.current) return;

        console.log("Beginning generation for:", text);
        processingRef.current = true;
        setIsProcessing(true);

        // Capture the length of text WE ARE SENDING.
        // If user types more while we wait, we don't want to skip it.
        const lengthProcessed = text.length;

        try {
            const response = await fetch('/api/generate-scene', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text }),
            });

            if (!response.ok) throw new Error(response.statusText);

            const data = await response.json();
            console.log("Generation response:", data);

            if (data.success && data.image) {
                const newScene: Scene = {
                    image: data.image,
                    narrative: data.narrative,
                    id: Date.now(),
                };
                setScenes(prev => [...prev, newScene]);
                // Safely advance cursor only by what we actually processed
                setLastProcessedLength(prev => prev + lengthProcessed);
            }
        } catch (err) {
            console.error("Scene generation error:", err);
        } finally {
            processingRef.current = false;
            setIsProcessing(false);
        }
    };

    const currentScene = scenes[scenes.length - 1];

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 py-8 px-4 font-sans text-gray-900">
            <Head>
                <title>Kids Storyteller</title>
            </Head>

            <main className="max-w-6xl mx-auto flex flex-col gap-8">
                <header className="text-center space-y-2">
                    <h1 className="text-5xl font-extrabold text-white drop-shadow-md tracking-tight">
                        Magic Storyteller ✨
                    </h1>
                    <p className="text-xl text-white/90 font-medium">
                        Start speaking to watch your movie come to life!
                    </p>
                </header>

                {/* Main Content Area */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

                    {/* Left Column: Input */}
                    <div className="space-y-6">
                        <StoryRecorder
                            onTranscriptChange={setCurrentTranscript}
                            isProcessing={isProcessing}
                        />

                        {/* Manual Trigger Button */}
                        <div className="flex justify-end -mt-4">
                            <button
                                onClick={() => {
                                    const newText = currentTranscript.slice(lastProcessedLength);
                                    if (newText.trim().length > 3) {
                                        handleGenerateScene(newText);
                                    } else {
                                        alert("Please narrate a bit more before generating a scene!");
                                    }
                                }}
                                disabled={isProcessing || currentTranscript.length === 0}
                                className={`px-6 py-2 rounded-full font-bold shadow-md transition-all 
                                    ${isProcessing
                                        ? 'bg-gray-300 cursor-not-allowed'
                                        : 'bg-purple-600 hover:bg-purple-700 text-white hover:scale-105'}`}
                            >
                                {isProcessing ? 'Creating...' : '✨ Generate Scene Now'}
                            </button>
                        </div>

                        <div className="bg-white/90 backdrop-blur rounded-xl p-6 shadow-lg border-2 border-indigo-200">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-gray-700 text-xl">Your Story So Far</h3>
                                {scenes.length > 0 && (
                                    <button
                                        onClick={() => {
                                            if (confirm('Are you sure you want to clear your story history? This cannot be undone.')) {
                                                setScenes([]);
                                                alert('History cleared!');
                                            }
                                        }}
                                        className="text-xs text-red-500 hover:text-red-700 font-semibold px-2 py-1 border border-red-200 rounded hover:bg-red-50 transition-colors"
                                    >
                                        Clear History
                                    </button>
                                )}
                            </div>
                            <div className="flex flex-col gap-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                {scenes.length === 0 && <span className="text-gray-400 italic">No scenes created yet. Start validating...</span>}
                                {scenes.map((scene, index) => (
                                    <div key={scene.id} className="flex flex-row gap-4 items-start p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                                        <img
                                            src={`/api/proxy-image?url=${encodeURIComponent(scene.image)}`}
                                            className="w-32 h-32 object-cover rounded-lg shadow-md flex-shrink-0 bg-gray-200"
                                            alt={`Scene ${index + 1}`}
                                        />
                                        <div className="flex-1">
                                            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1 block">Scene {index + 1}</span>
                                            <p className="text-gray-700 leading-relaxed text-sm">{scene.narrative}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {scenes.length > 0 && (
                            <VideoExporter scenes={scenes} />
                        )}
                    </div>

                    {/* Right Column: Display */}
                    <div className="sticky top-8">
                        <SceneDisplay
                            currentImage={currentScene?.image}
                            narrativeText={currentScene?.narrative || (isProcessing ? "Creating magic..." : "Start telling your story...")}
                            isLoading={isProcessing}
                        />
                    </div>

                </div>
            </main>
        </div>
    );
}
