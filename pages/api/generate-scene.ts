import type { NextApiRequest, NextApiResponse } from 'next';

type Data = {
    success: boolean;
    image?: string;
    narrative?: string;
    isNewScene: boolean;
    error?: string;
};

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<Data>
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, isNewScene: false, error: 'Method not allowed' });
    }

    const { text } = req.body;
    console.log("Received text for scene:", text);

    if (!text || text.length < 5) {
        console.log("Text too short");
        return res.status(200).json({ success: false, isNewScene: false, error: 'Text too short' });
    }

    try {
        // Improve prompt for better kid-friendly results
        const safeText = text.replace(/[^a-zA-Z0-9\s.,!?]/g, '');
        const encodedPrompt = encodeURIComponent(safeText + " kids story art"); // Minimal prompt

        // Ultra-fast resolution: 384x216
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?nologo=true&seed=${Math.floor(Math.random() * 10000)}&width=384&height=216&model=turbo`;

        console.log("Generated Image URL:", imageUrl);

        // Verify the URL is reachable (optional, but good for debugging)
        // For now, let's just return it. Pollinations usually works or returns an error image.

        // No artificial delay

        res.status(200).json({
            success: true,
            image: imageUrl,
            narrative: text,
            isNewScene: true
        });
    } catch (error) {
        console.error("API Handler Error:", error);
        res.status(500).json({ success: false, isNewScene: false, error: 'Internal server error' });
    }
}
