import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import API from "../api";

export default function ResumeAnalyzer() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please upload a PDF file.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      // Read file as base64 and send JSON to avoid multipart parsing issues
      const toBase64 = (f) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(f);
      });

      const base64 = await toBase64(file);
      const payload = {
        filename: file.name,
        content_type: file.type || 'application/pdf',
        content_base64: base64,
      };

      const res = await API.post("resume/analyze", payload);
      setResult(res.data);
    } catch (err) {
      const backendMessage = err.response?.data?.error || err.response?.data?.detail || err.message;
      setError(backendMessage || "Unable to analyze resume right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">🧠 Resume Analyzer</h1>
            <p className="text-slate-400 mt-2">Analyze a resume PDF and get an ATS-style review.</p>
          </div>
          <Link to="/dashboard" className="text-sm text-blue-400 hover:text-blue-300">
            ← Back to Dashboard
          </Link>
        </div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleAnalyze}
          className="rounded-3xl border border-white/10 bg-white/10 p-6 backdrop-blur-lg shadow-2xl"
        >
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Upload PDF
          </label>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />

          <button
            type="submit"
            disabled={loading}
            className="mt-5 rounded-xl bg-blue-500 px-5 py-2.5 font-semibold hover:bg-blue-600 disabled:opacity-60"
          >
            {loading ? "Analyzing..." : "Analyze Resume"}
          </button>
        </motion.form>

        {loading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="rounded-xl bg-slate-900/80 p-6 text-center max-w-lg mx-4">
              <div className="mb-4">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Analyzing Resume</h3>
              <p className="text-sm text-slate-300">This may take a little while — please wait.</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-6 space-y-6">
            <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-xl">
              <h2 className="text-xl font-semibold mb-4">Review Result</h2>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-sm text-slate-400">Score</p>
                  <p className="text-3xl font-bold text-blue-400">{result.review?.score ?? "N/A"}</p>
                </div>
                <div className="rounded-2xl bg-white/5 p-4">
                  <p className="text-sm text-slate-400">Skills</p>
                  <p className="text-sm text-slate-200">{(result.review?.skills || []).join(", ") || "None"}</p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {[
                  ["Missing Keywords", result.review?.missing_keywords || []],
                  ["Strengths", result.review?.strengths || []],
                  ["Weaknesses", result.review?.weaknesses || []],
                  ["Grammar Issues", result.review?.grammar_issues || []],
                  ["Recommendations", result.review?.recommendations || []],
                ].map(([title, items]) => (
                  <div key={title} className="rounded-2xl bg-white/5 p-4">
                    <h3 className="font-semibold mb-2">{title}</h3>
                    {items.length ? (
                      <ul className="list-disc pl-5 text-sm text-slate-300 space-y-1">
                        {items.map((item, index) => (
                          <li key={`${title}-${index}`}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-slate-400">No data</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-xl">
              <h2 className="text-xl font-semibold mb-4">Full Response (JSON)</h2>
              <pre className="max-h-80 overflow-auto text-sm whitespace-pre-wrap text-slate-200">{JSON.stringify(result, null, 2)}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
