import React, { useState, useEffect, useRef } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';
import { Download, Loader2 } from 'lucide-react';

interface VideoExporterProps {
    scenes: { image: string; narrative: string }[];
}

export const VideoExporter: React.FC<VideoExporterProps> = ({ scenes }) => {
    const [loaded, setLoaded] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const ffmpegRef = useRef(new FFmpeg());
    const messageRef = useRef<HTMLParagraphElement>(null);

    const load = async () => {
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
        const ffmpeg = ffmpegRef.current;

        // We handle log messages
        ffmpeg.on('log', ({ message }) => {
            if (messageRef.current) messageRef.current.innerHTML = message;
            console.log(message);
        });

        // Load from CDN
        // Note: If COOP/COEP headers block this, we need to host core locally.
        await ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });
        setLoaded(true);
    };

    useEffect(() => {
        load();
    }, []);

    const addTextToImage = async (imageUrl: string, text: string): Promise<Uint8Array> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            // Use our proxy to fetch
            img.src = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;

            img.onload = () => {
                const canvas = document.createElement('canvas');
                // Use a modest resolution for video
                const width = 1280;
                const height = 720;
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error("No canvas context"));
                    return;
                }

                // 1. Draw Image (Scaled to cover)
                // Simple cover algorithm
                const scale = Math.max(width / img.width, height / img.height);
                const x = (width / 2) - (img.width / 2) * scale;
                const y = (height / 2) - (img.height / 2) * scale;

                ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

                // 2. Draw Text Overlay
                // Gradient background at bottom
                const gradient = ctx.createLinearGradient(0, height - 200, 0, height);
                gradient.addColorStop(0, "transparent");
                gradient.addColorStop(0.5, "rgba(0,0,0,0.7)");
                gradient.addColorStop(1, "rgba(0,0,0,0.9)");
                ctx.fillStyle = gradient;
                ctx.fillRect(0, height - 200, width, 200);

                // Text settings
                ctx.font = "bold 32px sans-serif";
                ctx.fillStyle = "white";
                ctx.textAlign = "center";
                ctx.textBaseline = "bottom";

                // Text wrapping
                const maxWidth = width - 100;
                const words = text.split(' ');
                let line = '';
                const lines = [];

                for (let n = 0; n < words.length; n++) {
                    const testLine = line + words[n] + ' ';
                    const metrics = ctx.measureText(testLine);
                    const testWidth = metrics.width;
                    if (testWidth > maxWidth && n > 0) {
                        lines.push(line);
                        line = words[n] + ' ';
                    } else {
                        line = testLine;
                    }
                }
                lines.push(line);

                // Draw lines from bottom up
                let startY = height - 40 - (lines.length - 1) * 40;

                lines.forEach((l, i) => {
                    ctx.fillText(l.trim(), width / 2, startY + (i * 40));
                });

                // 3. Export to buffer
                canvas.toBlob(async (blob) => {
                    if (blob) {
                        const buffer = await blob.arrayBuffer();
                        resolve(new Uint8Array(buffer));
                    } else {
                        reject(new Error("Canvas export failed"));
                    }
                }, 'image/jpeg', 0.9);
            };

            img.onerror = (err) => reject(err);
        });
    };

    const exportVideo = async () => {
        const ffmpeg = ffmpegRef.current;
        if (!loaded) return;
        setIsExporting(true);

        try {
            // 1. Write images to FS with burned-in text
            for (let i = 0; i < scenes.length; i++) {
                const fileData = await addTextToImage(scenes[i].image, scenes[i].narrative);
                await ffmpeg.writeFile(`input${i}.jpg`, fileData);
            }

            // 2. Run FFmpeg command
            await ffmpeg.exec([
                '-framerate', '1/3',
                '-i', 'input%d.jpg',
                '-c:v', 'libx264',
                '-r', '30',
                '-pix_fmt', 'yuv420p',
                'output.mp4'
            ]);

            // 3. Read output
            const data = await ffmpeg.readFile('output.mp4');

            // 4. Create URL
            const url = URL.createObjectURL(new Blob([data as any], { type: 'video/mp4' }));

            // 5. Trigger download
            const a = document.createElement('a');
            a.href = url;
            a.download = 'my-story-with-subtitles.mp4';
            a.click();
        } catch (err) {
            console.error(err);
            alert('Failed to create video. See console for details.');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="mt-4">
            {!loaded ? (
                <div className="flex items-center gap-2 text-gray-500">
                    <Loader2 className="animate-spin" /> Loading Video Engine...
                </div>
            ) : (
                <button
                    onClick={exportVideo}
                    disabled={isExporting || scenes.length === 0}
                    className={`w-full py-4 rounded-xl font-bold text-xl shadow-xl transition-all flex items-center justify-center gap-2
            ${isExporting
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-green-500 hover:bg-green-600 text-white'}`}
                >
                    {isExporting ? <Loader2 className="animate-spin" /> : <Download />}
                    {isExporting ? 'Compiling Movie...' : 'Download Movie'}
                </button>
            )}
            <p ref={messageRef} className="text-xs text-gray-400 mt-2 font-mono h-4 overflow-hidden"></p>
        </div>
    );
};
