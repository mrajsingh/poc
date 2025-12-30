import React, { useState, useEffect, useCallback } from 'react';
import { Mic, MicOff, RefreshCw } from 'lucide-react';

interface StoryRecorderProps {
    onTranscriptChange: (transcript: string) => void;
    isProcessing?: boolean;
}

// Extend Window interface for SpeechRecognition
declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

export const StoryRecorder: React.FC<StoryRecorderProps> = ({ onTranscriptChange, isProcessing }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [recognition, setRecognition] = useState<any>(null);
    const [baseTranscript, setBaseTranscript] = useState('');
    const [sessionTranscript, setSessionTranscript] = useState('');

    const isRecordingRef = React.useRef(false); // Immediate state source of truth

    const recognitionRef = React.useRef<any>(null); // Sync reference to active instance
    const restartTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    const stopRecording = () => {
        setIsRecording(false);
        isRecordingRef.current = false;

        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch (e) { /* ignore */ }
        }
        setRecognition(null);
        recognitionRef.current = null;
    };

    const latestTranscriptRef = React.useRef(transcript);

    // Keep ref in sync efficiently
    useEffect(() => {
        latestTranscriptRef.current = transcript;
    }, [transcript]);

    const startRecording = () => {
        if (typeof window === 'undefined') return;
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        // Ensure any previous instance is dead
        if (recognitionRef.current) {
            try { recognitionRef.current.abort(); } catch (e) { }
        }

        const instance = new SpeechRecognition();
        instance.continuous = false; // changed to false for manual control
        instance.interimResults = true;
        instance.lang = 'en-US';

        instance.onresult = (event: any) => {
            if (!isRecordingRef.current) return;

            // With continuous=false, we usually get just one result [0]
            // But we still loop to be safe, though usually it's just one item.
            let finalChunk = '';
            let interimChunk = '';

            for (let i = 0; i < event.results.length; i++) {
                const res = event.results[i];
                if (res.isFinal) {
                    finalChunk += res[0].transcript;
                } else {
                    interimChunk += res[0].transcript;
                }
            }

            // CRITICAL: If we get a final chunk, we bake it IMMEDIATELY into base
            // and clear session, so next restart is clean.
            if (finalChunk) {
                // Add space if needed
                const textToAppend = finalChunk.trim();
                let params = {};
                // We need to access the LATEST base to append correctly. 
                // We can't rely on closure 'baseTranscript'.
                // We use the state updater pattern or ref.
                // Since this is async event, let's use the updating state pattern in setBase.
                setBaseTranscript(prev => {
                    const spacer = (prev && !prev.endsWith(' ')) ? ' ' : '';
                    return prev + spacer + textToAppend;
                });
                setSessionTranscript(''); // Session is done
            }

            setInterimTranscript(interimChunk);
        };

        instance.onerror = (event: any) => {
            if (event.error === 'no-speech') {
                // Ignore no-speech errors, just restart
                return;
            }
            console.error('Speech error', event.error);
            if (event.error === 'not-allowed') {
                stopRecording();
            }
        };

        instance.onend = () => {
            // Auto-restart if we are still "Recording"
            if (isRecordingRef.current) {
                // Small delay to prevent CPU thrashing if it fails instantly
                setTimeout(() => {
                    if (isRecordingRef.current) {
                        try {
                            startRecording();
                        } catch (e) {
                            stopRecording();
                        }
                    }
                }, 50);
            }
        };

        try {
            instance.start();
            setRecognition(instance);
            recognitionRef.current = instance;
            // set flags if this is the initial start (not a restart)
            // But startRecording is called recursively, so flags are already set?
            // checking logic
            if (!isRecordingRef.current) {
                setIsRecording(true);
                isRecordingRef.current = true;
            }
        } catch (e) {
            console.error(e);
        }
    };

    // Clean up on unmount
    useEffect(() => {
        return () => {
            if (recognitionRef.current) recognitionRef.current.abort();
        };
    }, []);

    // Sync with parent
    useEffect(() => {
        const fullText = baseTranscript + sessionTranscript + interimTranscript;
        // avoid infinite loop if no change
        if (fullText !== transcript) {
            setTranscript(fullText);
            onTranscriptChange(fullText);
        }
    }, [baseTranscript, sessionTranscript, interimTranscript, onTranscriptChange, transcript]);

    const toggleRecording = () => {
        if (isRecording) {
            stopRecording();
            // No need to bake here, chunks are baked on the fly.
            // But we might have a pending "interim" that was abandoned?
            // If we stop, we usually discard interim to avoid fractional words.
            setSessionTranscript('');
            setInterimTranscript('');
        } else {
            // STARTING
            // Sync base with whatever is currently in the box (e.g. manual edits)
            setBaseTranscript(transcript);
            startRecording();
        }
    };

    const clearTranscript = () => {
        setTranscript('');
        setBaseTranscript('');
        setSessionTranscript('');
        setInterimTranscript('');
        onTranscriptChange('');
        if (isRecording) {
            stopRecording();
        }
    };

    // Manual text edit with DEBOUNCE
    const handleManualEdit = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setTranscript(val);
        setBaseTranscript(val);
        setSessionTranscript('');
        setInterimTranscript('');

        // If we heavily edit, we should stop listneing to avoid race conditions
        if (isRecording) {
            // Just abort the current chunk. 
            // The debounce restart will pick up the NEW baseTranscript from state.
            if (recognitionRef.current) {
                recognitionRef.current.abort();
                isRecordingRef.current = false;
            }

            if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
            restartTimeoutRef.current = setTimeout(() => {
                console.log("Restarting after edit...");
                // Note: startRecording doesn't take args, it just starts.
                // It relies on isRecordingRef? No, we set it false above.
                // We need to turn it back on.
                isRecordingRef.current = true;
                startRecording();
            }, 800);
        }
    };

    if (typeof window !== 'undefined' && !(window.SpeechRecognition || window.webkitSpeechRecognition)) {
        return <div>Speech Recognition is not supported in this browser.</div>;
    }

    return (
        <div className="w-full max-w-2xl mx-auto p-4 bg-white/10 backdrop-blur-md rounded-xl shadow-lg border border-white/20">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Narrate Your Story</h2>
                <div className="flex gap-2">
                    <button
                        onClick={clearTranscript}
                        className="p-2 text-gray-600 hover:text-red-500 transition-colors"
                        title="Clear Story"
                    >
                        <RefreshCw size={20} />
                    </button>
                    <button
                        onClick={toggleRecording}
                        className={`p-3 rounded-full transition-all duration-300 transform hover:scale-110 ${isRecording
                            ? 'bg-red-500 text-white shadow-red-500/50 shadow-lg animate-pulse'
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300 shadow-lg'
                            }`}
                    >
                        {isRecording ? <Mic size={24} /> : <MicOff size={24} />}
                    </button>
                </div>
            </div>

            <div className="relative bg-gray-50 dark:bg-gray-900/50 rounded-lg p-2 min-h-[150px] border border-gray-200 dark:border-gray-700">
                <textarea
                    value={transcript}
                    onChange={handleManualEdit}
                    placeholder="Press the microphone and tell your story (or type here)..."
                    className="w-full h-[150px] p-2 bg-transparent border-none outline-none resize-none text-lg leading-relaxed text-gray-700 dark:text-gray-300 font-medium"
                />
                {isRecording && <div className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full animate-pulse" />}
            </div>
        </div>
    );
};
