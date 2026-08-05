from typing import Optional, TypedDict
import json
import os
import tempfile
from base64 import b64decode
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

try:
    from groq import Groq
except ImportError:  # pragma: no cover - safe fallback when dependency is unavailable
    Groq = None

try:
    from langchain_groq import ChatGroq
except ImportError:
    ChatGroq = None

try:
    from github import Github, Auth
except ImportError:
    Github = None
    Auth = None

# Load environment variables
load_dotenv()

api_key = os.getenv("GROQ_API_KEY")
git_hub_token = os.getenv("GIT_HUB_TOKEN")

github = None
if Github is not None and Auth is not None and git_hub_token:
    try:
        auth = Auth.Token(git_hub_token)
        github = Github(auth=auth)
    except Exception as exc:
        print(f"GitHub auth initialization failed: {exc}")
        github = None

model = None
if ChatGroq is not None and api_key:
    try:
        model = ChatGroq(api_key=api_key, model="llama-3.3-70b-versatile", temperature=0.7)
    except Exception as exc:
        print(f"ChatGroq init failed: {exc}")
        model = None


class ChatRequest(BaseModel):
    message: str


class ResumeAnalyzeRequest(BaseModel):
    filename: str
    content_type: str
    content_base64: str


app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Key check
api_key = os.getenv("GROQ_API_KEY")


def generate_response(message: str) -> str:
    if not api_key:
        return "Error: GROQ_API_KEY is not set in Render environment variables."

    if Groq is None:
        return "Error: groq package is not installed in the AI service environment."

    try:
        client = Groq(api_key=api_key)
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": message},
            ],
        )
        return completion.choices[0].message.content or "No response generated."
    except Exception as exc:
        print(f"Groq Error: {exc}")
        return f"Error: {exc}"


@app.post("/chat")
async def chat(request: ChatRequest):
    response = generate_response(request.message)
    return {"reply": response}


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "api_key_set": bool(api_key),
        "github_token_set": bool(git_hub_token),
    }


def file_exists(repo, path):
    try:
        repo.get_contents(path)
        return True
    except Exception:
        return False


def fetch_profile(state):
    try:
        user = github.get_user(state["username"])
    except Exception as exc:
        # Normalize GitHub not-found / API errors into a clear HTTPException
        raise HTTPException(status_code=404, detail=f"GitHub user '{state['username']}' not found.") from exc

    state["profile"] = {
        "name": user.name,
        "followers": user.followers,
        "following": user.following,
        "public_repos": user.public_repos,
        "bio": user.bio,
    }
    return state


def fetch_repositories(state):
    user = github.get_user(state["username"])
    state["repositories"] = [repo for repo in user.get_repos()]
    return state


def analyze_repositories(state):
    reports = []
    for repo in state["repositories"]:
        try:
            commit = repo.get_commits()[0]
            last_commit_date = commit.commit.author.date
            days_since_last_commit = (datetime.now(timezone.utc) - last_commit_date).days
        except Exception:
            last_commit_date = None
            days_since_last_commit = None

        try:
            languages = list(repo.get_languages().keys())
        except Exception:
            languages = []
        if not languages:
            languages = ["Unknown"]

        readme = file_exists(repo, "README.md") or file_exists(repo, "readme.md")
        testing = (
            file_exists(repo, "tests")
            or file_exists(repo, "test")
            or file_exists(repo, "pytest.ini")
            or file_exists(repo, "tox.ini")
        )
        cicd = file_exists(repo, ".github/workflows")
        docker = file_exists(repo, "Dockerfile")
        docs = file_exists(repo, "docs")
        license_file = file_exists(repo, "LICENSE") or file_exists(repo, "LICENSE.md")

        if days_since_last_commit is None:
            activity = "Unknown"
        elif days_since_last_commit <= 30:
            activity = "Active"
        elif days_since_last_commit <= 90:
            activity = "Inactive"
        else:
            activity = "Dormant"

        reports.append({
            "name": repo.name,
            "description": repo.description or "No description",
            "url": repo.html_url,
            "language": repo.language or "Unknown",
            "languages": languages,
            "stars": repo.stargazers_count,
            "forks": repo.forks_count,
            "watchers": repo.watchers_count,
            "issues": repo.open_issues_count,
            "size_kb": repo.size,
            "default_branch": repo.default_branch,
            "private": repo.private,
            "archived": repo.archived,
            "last_commit_date": last_commit_date.isoformat() if last_commit_date else None,
            "days_since_last_commit": days_since_last_commit,
            "activity": activity,
            "readme": readme,
            "testing": testing,
            "cicd": cicd,
            "docker": docker,
            "docs": docs,
            "license": license_file,
        })

    state["repo_analysis"] = reports
    return state


def fetch_readme(state):
    readmes = []
    for repo in state["repositories"]:
        try:
            readme = repo.get_readme()
            content = b64decode(readme.content).decode("utf-8", errors="ignore")
        except Exception:
            content = "No README found."
        readmes.append({"name": repo.name, "content": content})
    state["readme_data"] = readmes
    return state


def fetch_commits(state):
    commit_reports = []
    for repo in state["repositories"]:
        try:
            commits = repo.get_commits()
            total_commits = commits.totalCount
            latest = commits[0]
            latest_message = latest.commit.message
            latest_date = latest.commit.author.date
            messages = [commit.commit.message for _, commit in zip(range(10), commits)]
        except Exception:
            total_commits = 0
            latest_message = "Unknown"
            latest_date = None
            messages = []
        commit_reports.append({
            "name": repo.name,
            "total_commits": total_commits,
            "latest_commit": latest_message,
            "latest_date": latest_date.isoformat() if latest_date else None,
            "messages": messages,
        })
    state["commit_data"] = commit_reports
    return state


def fetch_issues(state):
    issue_reports = []
    for repo in state["repositories"]:
        try:
            issues = repo.get_issues(state="all")
            total_issues = issues.totalCount
            open_issues = repo.get_issues(state="open").totalCount
            closed_issues = repo.get_issues(state="closed").totalCount
            recent_issues = []
            count = 0
            for issue in issues:
                if issue.pull_request is not None:
                    continue
                recent_issues.append({
                    "title": issue.title,
                    "state": issue.state,
                    "created_at": issue.created_at.isoformat(),
                })
                count += 1
                if count == 5:
                    break
        except Exception:
            total_issues = 0
            open_issues = 0
            closed_issues = 0
            recent_issues = []
        issue_reports.append({
            "name": repo.name,
            "total_issues": total_issues,
            "open_issues": open_issues,
            "closed_issues": closed_issues,
            "recent_issues": recent_issues,
        })
    state["issue_data"] = issue_reports
    return state


def fetch_prs(state):
    pr_reports = []
    for repo in state["repositories"]:
        try:
            open_prs = repo.get_pulls(state="open")
            closed_prs = repo.get_pulls(state="closed")
            total_open = open_prs.totalCount
            total_closed = closed_prs.totalCount
            recent_prs = []
            count = 0
            for pr in open_prs:
                recent_prs.append({
                    "title": pr.title,
                    "state": pr.state,
                    "created_at": pr.created_at.isoformat(),
                })
                count += 1
                if count == 5:
                    break
        except Exception:
            total_open = 0
            total_closed = 0
            recent_prs = []
        pr_reports.append({
            "name": repo.name,
            "open_prs": total_open,
            "closed_prs": total_closed,
            "recent_prs": recent_prs,
        })
    state["pr_data"] = pr_reports
    return state


def ai_repository_review(state):
    if model is None:
        raise HTTPException(status_code=500, detail="AI reviewer is not available because ChatGroq is not configured.")

    reports = []
    for repo, readme, commit, issue, pr in zip(
        state["repo_analysis"],
        state["readme_data"],
        state["commit_data"],
        state["issue_data"],
        state["pr_data"],
    ):
        prompt = f"""
You are a Senior Software Architect and GitHub Code Reviewer.

Your task is to review the repository like an experienced software engineer.

==========================================================
Repository Information
==========================================================

Repository Name:
{repo['name']}

Description:
{repo['description']}

Primary Language:
{repo['language']}

All Languages:
{', '.join(repo['languages'])}

Stars:
{repo['stars']}

Forks:
{repo['forks']}

Open Issues:
{repo['issues']}

Repository Activity:
{repo['activity']}

Days Since Last Commit:
{repo['days_since_last_commit']}

README Present:
{repo['readme']}

Testing Present:
{repo['testing']}

CI/CD Present:
{repo['cicd']}

Docker Support:
{repo['docker']}

Documentation Folder:
{repo['docs']}

License:
{repo['license']}

==========================================================
README
==========================================================

{readme['content'][:3000]}

==========================================================
Commit Analysis
==========================================================

Total Commits:
{commit['total_commits']}

Latest Commit:
{commit['latest_commit']}

Latest Commit Date:
{commit['latest_date']}

Recent Commit Messages:
{commit['messages']}

==========================================================
Issue Analysis
==========================================================

Total Issues:
{issue['total_issues']}

Open Issues:
{issue['open_issues']}

Closed Issues:
{issue['closed_issues']}

Recent Issues:
{issue['recent_issues']}

==========================================================
Pull Request Analysis
==========================================================

Open Pull Requests:
{pr['open_prs']}

Closed Pull Requests:
{pr['closed_prs']}

Recent Pull Requests:
{pr['recent_prs']}

==========================================================

Evaluate this repository and provide the report in EXACTLY this format.

# Repository Review

## Overall Summary
(2-3 lines)

## Strengths
- Bullet points

## Weaknesses
- Bullet points

## Documentation
Score: X/10

Reason:

## Commit Quality
Score: X/10

Reason:

## Issue Management
Score: X/10

Reason:

## Pull Request Management
Score: X/10

Reason:

## Code Maintainability
Excellent / Good / Average / Poor

Reason:

## Production Readiness
Excellent / Good / Average / Poor

Reason:

## Suggestions
- Bullet points

## Final Repository Score
X/10

Do not use markdown tables.
"""
        response = model.invoke(prompt)
        reports.append({"name": repo["name"], "ai_review": response.content})
    state["repository_reports"] = reports
    return state


def run_github_analysis(username: str):
    if github is None:
        raise HTTPException(status_code=500, detail="GitHub analyzer is not configured. Set GIT_HUB_TOKEN and install PyGithub.")
    state = {
        "username": username,
        "profile": {},
        "repositories": [],
        "repo_analysis": [],
        "readme_data": [],
        "commit_data": [],
        "issue_data": [],
        "pr_data": [],
        "repository_reports": [],
    }
    state = fetch_profile(state)
    state = fetch_repositories(state)
    state = analyze_repositories(state)
    state = fetch_readme(state)
    state = fetch_commits(state)
    state = fetch_issues(state)
    state = fetch_prs(state)
    state = ai_repository_review(state)
    return {
        "profile": state["profile"],
        "repo_analysis": state["repo_analysis"],
        "readme_data": state["readme_data"],
        "commit_data": state["commit_data"],
        "issue_data": state["issue_data"],
        "pr_data": state["pr_data"],
        "repository_reports": state["repository_reports"],
    }


@app.get("/github-analyzer")
def github_analyzer(username: Optional[str] = None):
    if not username:
        raise HTTPException(status_code=400, detail="Please provide a GitHub username.")
    return run_github_analysis(username)


@app.get("/resume_analyzer")
def resume_analyzer_get(pdf_path: Optional[str] = None):
    target_path = pdf_path or os.getenv("PDF_PATH")
    if not target_path:
        raise HTTPException(status_code=400, detail="Please provide a pdf_path.")
    return analyze_resume_file(target_path)


@app.post("/resume_analyzer")
async def resume_analyzer_post(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Please upload a PDF file.")

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        content = await file.read()
        tmp.write(content)
        temp_path = tmp.name

    try:
        return analyze_resume_file(temp_path)
    finally:
        try:
            os.remove(temp_path)
        except OSError:
            pass


def analyze_resume_file(pdf_path: str):
    if not api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is not set.")

    try:
        import fitz
    except ImportError as exc:
        raise HTTPException(status_code=500, detail=f"Missing dependency: {exc}") from exc

    path = Path(pdf_path)
    if not path.exists():
        raise HTTPException(status_code=400, detail=f"PDF file not found: {pdf_path}")
    if path.suffix.lower() != ".pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    docs = fitz.open(str(path))
    text = ""
    for page in docs:
        text += page.get_text()
    docs.close()

    prompt = f"""
You are an ATS Resume Reviewer.
Analyze the resume below.
DO NOT use markdown.
DO NOT use ```json.
DO NOT explain anything.
Return ONLY valid JSON in this format:

{{
  "score": 80,
  "skills": [],
  "missing_keywords": [],
  "strengths": [],
  "weaknesses": [],
  "grammar_issues": [],
  "recommendations": []
}}

Resume:
{text}
"""

    if Groq is None:
        raise HTTPException(status_code=500, detail="groq package is not installed in the AI service environment.")

    try:
        client = Groq(api_key=api_key)
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            temperature=0.2,
            messages=[
                {"role": "system", "content": "You are an ATS Resume Reviewer. Return only valid JSON."},
                {"role": "user", "content": prompt},
            ],
        )
        content = response.choices[0].message.content if response.choices else ""
        content = content or ""
        try:
            result = json.loads(content)
        except (TypeError, json.JSONDecodeError):
            result = {"error": content}
        return {"review": result}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc