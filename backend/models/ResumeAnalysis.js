const mongoose = require('mongoose');

const ResumeAnalysisSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  result: { type: mongoose.Schema.Types.Mixed, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ResumeAnalysis', ResumeAnalysisSchema);
