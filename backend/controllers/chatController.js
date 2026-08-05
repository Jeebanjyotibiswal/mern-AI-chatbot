const DEFAULT_AI_URL = 'http://127.0.0.1:8000';

const resolveFetch = () => {
    if (typeof globalThis.fetch === 'function') {
        return globalThis.fetch;
    }
    try {
        const { createRequire } = require('module');
        const requireFromModule = createRequire(__filename);
        const nodeFetch = requireFromModule('node-fetch');
        return nodeFetch.default || nodeFetch;
    } catch (err) {
        console.error('Failed to resolve fetch:', err.message);
        return null;
    }
};
const fetch = resolveFetch();
if (typeof fetch !== 'function') {
    throw new Error('Fetch is not available in this Node runtime.');
}

const getAIUrl = () => {
    const configured = (process.env.AI_URL || '').trim().replace(/\/$/, '');
    return configured || DEFAULT_AI_URL;
};

const buildUrl = (path) => {
    const base = getAIUrl();
    return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
};

const tryFetchWithLocalFallback = async (fetchFn, url, options) => {
    try {
        return await fetchFn(url, options);
    } catch (err) {
        const primary = getAIUrl();
        if (primary !== DEFAULT_AI_URL) {
            const localUrl = url.replace(primary, DEFAULT_AI_URL);
            return await fetchFn(localUrl, options);
        }
        throw err;
    }
};

exports.chat = async (req, res) => {
    try {
        const { message } = req.body;
        const response = await tryFetchWithLocalFallback(fetch, buildUrl('/chat'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || errorData.error || 'AI Service Error');
        }

        const data = await response.json();
        res.json(data);

    } catch (err) {
        const aiUrl = getAIUrl();
        console.error("AI Service Error:", err.message);
        console.error("Attempted URL:", `${aiUrl}/chat`);
        res.status(500).json({ reply: "Sorry, I am having trouble connecting to the server. Please try again later." });
    }
};