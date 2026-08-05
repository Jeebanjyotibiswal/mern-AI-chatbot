const express = require('express');
const multer = require('multer');
const router = express.Router();
const { analyzeResume } = require('../controllers/resumeAlalyzerController');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/analyze', upload.single('file'), analyzeResume);

module.exports = router;
