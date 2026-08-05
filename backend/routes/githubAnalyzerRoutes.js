const express = require('express');
const router = express.Router();
const { getGithubAnalysis } = require('../controllers/githubAnalyzerController');

router.get('/', getGithubAnalysis);

module.exports = router;
