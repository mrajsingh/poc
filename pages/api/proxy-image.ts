import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
        return res.status(400).send('Missing url param');
    }

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);

        const contentType = response.headers.get('content-type');
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (contentType) res.setHeader('Content-Type', contentType);
        // Essential for COOP/COEP environments
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

        // Also cache it a bit
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

        res.send(buffer);
    } catch (err) {
        console.error('Proxy error:', err);
        res.status(500).send('Error fetching image');
    }
}
