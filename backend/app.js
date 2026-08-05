const express = require('express');
require('dotenv').config();
const cors = require('cors');
const connectDB = require('./config/db');
const multer = require('multer');
const { analyzeResume } = require('./controllers/resumeAlalyzerController');
const githubAnalyzerRoutes = require('./routes/githubAnalyzerRoutes');

const app = express();

// Log incoming requests for debugging multipart parsing issues
app.use((req, res, next) => {
    try {
        console.log('Incoming request:', req.method, req.originalUrl, 'Content-Type:', req.headers['content-type']);
    } catch (e) {
        console.log('Incoming request logging error');
    }
    next();
});

connectDB().catch(() => {
    console.log('MongoDB connection failed; continuing without DB for local resume analyzer testing.');
});

const upload = multer({ storage: multer.memoryStorage() });

const jsonParser = express.json({ limit: '150mb' });
app.use(express.urlencoded({ extended: true, limit: '150mb' }));

app.use(cors());
app.use((req, res, next) => {
    if (req.is('multipart/form-data')) {
        return next();
    }
    return jsonParser(req, res, next);
});

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));
app.use('/api/github-analyzer', githubAnalyzerRoutes);
app.post(
    '/api/resume/analyze',
    (req, res, next) => {
        console.log('Resume analyzer content-type:', req.headers['content-type']);
        next();
    },
    upload.single('file'),
    analyzeResume
);
app.get('/api/resume/analyze', (req, res) => {
    res.status(405).json({ error: 'Method not allowed. Use POST to analyze a PDF.' });
});
app.use('/api/resume', (req, res) => {
    res.status(404).json({ error: 'Resume analyzer route not found.' });
});

app.use((err, req, res, next) => {
    if (!err) {
        return next();
    }
    console.error('Resume analyzer error handler:', err);
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});