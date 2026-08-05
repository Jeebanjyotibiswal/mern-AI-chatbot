const FormData = require('form-data');
const ResumeAnalysis = require('../models/ResumeAnalysis');

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

exports.analyzeResume = async (req, res) => {
    try {
        // Support two upload styles:
        // 1) multipart/form-data via multer -> req.file
        // 2) JSON body with base64 content -> { filename, content_type, content_base64 }
        let filename;
        let contentType;
        let fileBuffer;

        if (req.file && req.file.buffer) {
            filename = req.file.originalname;
            contentType = req.file.mimetype;
            fileBuffer = req.file.buffer;
        } else if (req.body && req.body.content_base64) {
            // JSON upload path (bypasses multipart parsing issues)
            filename = req.body.filename || 'upload.pdf';
            contentType = req.body.content_type || 'application/pdf';
            try {
                fileBuffer = Buffer.from(req.body.content_base64, 'base64');
            } catch (e) {
                return res.status(400).json({ error: 'Invalid base64 file content.' });
            }
        } else {
            return res.status(400).json({ error: 'Please upload a PDF file.' });
        }

        if (contentType !== 'application/pdf') {
            return res.status(400).json({ error: 'Only PDF files are supported.' });
        }

        const formData = new FormData();
        // Append the file buffer directly; FormData in Node accepts Buffer
        formData.append('file', fileBuffer, {
          filename: filename,
          contentType: contentType
        });

        let response;
        try {
            const fetchHeaders = formData.getHeaders();
            const url = buildUrl('/resume_analyzer');
            console.log('Forwarding resume to AI service:', url);
            response = await tryFetchWithLocalFallback(fetch, url, {
                method: 'POST',
                headers: fetchHeaders,
                body: formData
            });
        } catch (fetchErr) {
            const aiUrl = getAIUrl();
            return res.status(502).json({
                error: `AI service is unreachable at ${aiUrl}. ${fetchErr.message}`
            });
        }

        const responseText = await response.text();
        console.log('AI service response status:', response.status);
        try { console.log('AI service response body (truncated):', responseText.slice(0,1000)); } catch(e) { }
        let data = {};
        try {
            data = JSON.parse(responseText);
        } catch {
            data = { error: responseText || 'No response from AI service.' };
        }

        if (!response.ok) {
            return res.status(response.status).json({
                error: data.detail || data.error || 'Unable to analyze resume right now.'
            });
        }

        try {
            await ResumeAnalysis.create({ filename: req.file.originalname, result: data });
        } catch (saveErr) {
            console.error('Failed to save resume analysis to DB:', saveErr.message);
        }

        res.json(data);
    } catch (err) {
        console.error('Resume Analyzer Error:', err.message);
        res.status(500).json({
            error: 'Sorry, I could not analyze the resume right now. Please try again later.'
        });
    }
};
