import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import API from "../api";

export default function GithubAnalyzer() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleAnalyze = async (event) => {
    event.preventDefault();
    if (!username.trim()) {
      setError("Please enter a GitHub username.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await API.get("/github-analyzer", {
        params: { username: username.trim() },
      });
      setResult(res.data);
    } catch (err) {
      const backendMessage = err.response?.data?.error || err.response?.data?.detail || err.message;
      setError(backendMessage || "Unable to fetch GitHub analysis right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">🐙 GitHub Analyzer</h1>
            <p className="text-slate-400 mt-2">Review a GitHub username and get repository health and activity insights.</p>
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
            GitHub Username
          </label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="octocat"
            className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />

          <button
            type="submit"
            disabled={loading}
            className="mt-5 rounded-xl bg-blue-500 px-5 py-2.5 font-semibold hover:bg-blue-600 disabled:opacity-60"
          >
            {loading ? "Analyzing..." : "Analyze GitHub"}
          </button>
        </motion.form>

        {/* Loading overlay */}
        {loading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="rounded-xl bg-slate-900/80 p-6 text-center max-w-lg mx-4">
              <div className="mb-4">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Analyzing GitHub account</h3>
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
              <h2 className="text-xl font-semibold mb-4">Profile</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-slate-400">Name</p>
                  <p className="text-lg font-semibold">{result.profile?.name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Public Repos</p>
                  <p className="text-lg font-semibold">{result.profile?.public_repos ?? "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Followers</p>
                  <p className="text-lg font-semibold">{result.profile?.followers ?? "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Following</p>
                  <p className="text-lg font-semibold">{result.profile?.following ?? "N/A"}</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-xl">
              <h2 className="text-xl font-semibold mb-4">Repository Analysis</h2>
              {result.repo_analysis?.length ? (
                <div className="space-y-4">
                  {result.repo_analysis.map((repo) => (
                    <div key={repo.name} className="rounded-2xl bg-white/5 p-4">
                      <div className="flex flex-col gap-2 md:flex-row md:justify-between md:items-center">
                        <div>
                          <p className="text-sm text-slate-400">Repository</p>
                          <a href={repo.url} target="_blank" rel="noreferrer" className="text-base font-semibold text-blue-300 hover:text-blue-200">
                            {repo.name}
                          </a>
                        </div>
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 text-sm text-slate-300">
                          <div><span className="font-semibold text-white">{repo.language}</span><div>Language</div></div>
                          <div><span className="font-semibold text-white">{repo.stars}</span><div>Stars</div></div>
                          <div><span className="font-semibold text-white">{repo.forks}</span><div>Forks</div></div>
                          <div><span className="font-semibold text-white">{repo.activity}</span><div>Status</div></div>
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-slate-400">{repo.description || "No description."}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">No repositories found or analysis returned no results.</p>
              )}
            </div>

            {/* Readme Data */}
            {result.readme_data?.length > 0 && (
              <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-xl">
                <h2 className="text-xl font-semibold mb-4">Readmes</h2>
                <div className="space-y-4">
                  {result.readme_data.map((r) => (
                    <div key={r.name} className="rounded-2xl bg-white/5 p-4">
                      <p className="text-sm text-slate-400">{r.name}</p>
                      <pre className="mt-2 max-h-48 overflow-auto text-sm whitespace-pre-wrap text-slate-200">{r.content}</pre>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Commit Data */}
            {result.commit_data?.length > 0 && (
              <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-xl">
                <h2 className="text-xl font-semibold mb-4">Commits</h2>
                <div className="space-y-4">
                  {result.commit_data.map((c) => (
                    <div key={c.name} className="rounded-2xl bg-white/5 p-4">
                      <p className="text-sm text-slate-400">{c.name}</p>
                      <p className="mt-1 text-sm text-slate-200">Latest: {c.latest_commit}</p>
                      <p className="text-xs text-slate-400">Total commits: {c.total_commits}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Issues and PRs */}
            {(result.issue_data?.length > 0 || result.pr_data?.length > 0) && (
              <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-xl">
                <h2 className="text-xl font-semibold mb-4">Issues & Pull Requests</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {result.issue_data?.map((i) => (
                    <div key={i.name} className="rounded-2xl bg-white/5 p-4">
                      <p className="text-sm text-slate-400">{i.name}</p>
                      <p className="text-sm text-slate-200">Open issues: {i.open_issues}</p>
                    </div>
                  ))}
                  {result.pr_data?.map((p) => (
                    <div key={p.name} className="rounded-2xl bg-white/5 p-4">
                      <p className="text-sm text-slate-400">{p.name}</p>
                      <p className="text-sm text-slate-200">Open PRs: {p.open_prs}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Reviews */}
            {result.repository_reports?.length > 0 && (
              <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-xl">
                <h2 className="text-xl font-semibold mb-4">AI Repository Reviews</h2>
                <div className="space-y-4">
                  {result.repository_reports.map((rep) => (
                    <div key={rep.name} className="rounded-2xl bg-white/5 p-4">
                      <p className="text-sm text-slate-400">{rep.name}</p>
                      <pre className="mt-2 max-h-64 overflow-auto text-sm whitespace-pre-wrap text-slate-200">{rep.ai_review}</pre>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Raw JSON dump */}
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
