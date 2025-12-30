import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SceneDisplayProps {
    currentImage?: string;
    narrativeText?: string;
    isLoading?: boolean;
}

export const SceneDisplay: React.FC<SceneDisplayProps> = ({
    currentImage,
    narrativeText,
    isLoading: isApiLoading
}) => {
    const [isImgLoaded, setIsImgLoaded] = useState(false);

    // Reset loaded state when image changes
    React.useEffect(() => {
        setIsImgLoaded(false);
    }, [currentImage]);

    const showLoading = isApiLoading || (currentImage && !isImgLoaded);

    return (
        <div className="w-full max-w-4xl mx-auto mt-8 relative aspect-video bg-indigo-900/10 backdrop-blur rounded-2xl overflow-hidden shadow-2xl border-4 border-white/20">
            <div className="absolute top-4 left-4 z-10 bg-black/50 text-white text-xs px-2 py-1 rounded backdrop-blur">
                Live Scene
            </div>
            <AnimatePresence exitBeforeEnter>
                {currentImage && (
                    <motion.img
                        key={currentImage}
                        src={`/api/proxy-image?url=${encodeURIComponent(currentImage)}`}
                        alt="Story scene"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: isImgLoaded ? 1 : 0 }}
                        onLoad={() => setIsImgLoaded(true)}
                        className="w-full h-full object-cover absolute inset-0"
                    />
                )}

                {showLoading && (
                    <motion.div
                        key="loader"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="w-full h-full flex items-center justify-center bg-gray-900 absolute inset-0 z-20"
                    >
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-gray-400 animate-pulse">
                                {isApiLoading ? "Dreaming up scene..." : "Painting pixels..."}
                            </p>
                        </div>
                    </motion.div>
                )}

                {!currentImage && !showLoading && (
                    <div className="w-full h-full flex items-center justify-center bg-gray-900">
                        <p className="text-gray-600">Waiting for story...</p>
                    </div>
                )}
            </AnimatePresence>

            {/* Caption Overlay */}
            <AnimatePresence>
                {narrativeText && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 50, opacity: 0 }}
                        className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent"
                    >
                        <p className="text-white text-xl md:text-2xl font-serif text-center drop-shadow-lg">
                            {narrativeText}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
