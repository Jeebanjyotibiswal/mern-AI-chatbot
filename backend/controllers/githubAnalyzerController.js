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

exports.getGithubAnalysis = async (req, res) => {
    const username = req.query.username;
    if (!username) {
        return res.status(400).json({ error: 'Please provide a GitHub username.' });
    }

    const requestUrl = buildUrl(`/github-analyzer?username=${encodeURIComponent(username)}`);
    try {
        console.log('GitHub analyzer proxy fetching URL:', requestUrl);
        const response = await tryFetchWithLocalFallback(fetch, requestUrl);
        const text = await response.text();

        let data;
        try {
            data = JSON.parse(text);
        } catch {
            data = { error: text || 'Invalid response from AI service.' };
        }

        if (!response.ok) {
            return res.status(response.status).json({
                error: data.error || data.detail || 'Unable to analyze GitHub account right now.'
            });
        }

        // Persist the analysis result to MongoDB for later inspection
        try {
            const GithubAnalysis = require('../models/GithubAnalysis');
            await GithubAnalysis.create({ username, result: data });
        } catch (saveErr) {
            console.error('Failed to save GitHub analysis to DB:', saveErr.message);
            // Do not fail the request because of DB save issues — return analysis anyway
        }

        res.json(data);
    } catch (err) {
        const aiUrl = getAIUrl();
        console.error('GitHub Analyzer Proxy Error:', err && err.stack ? err.stack : err.message || err);
        res.status(502).json({
            error: `AI service is unreachable at ${aiUrl}. ${err.message}`
        });
    }
};