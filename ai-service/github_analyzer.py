########################### LLM SETUP ###########################
from langchain_groq import ChatGroq
from dotenv import load_dotenv

from langgraph.graph import StateGraph, START, END
from typing import TypedDict

import os
import json
load_dotenv()
api_key = os.getenv("GROQ_API_KEY")
model=ChatGroq(api_key=api_key, model="llama-3.3-70b-versatile", temperature=0.7)

############################ GIT HUB TOKEN SETUP ###########################
git_hub_token = os.getenv("GIT_HUB_TOKEN")
from github import Github, Auth

auth = Auth.Token(git_hub_token)
github = Github(auth=auth)

########################### state defined here#######################

class GithubState(TypedDict):

    username: str

    profile: dict

    repositories: list

    repo_analysis: list

    readme_data: list

    commit_data: list

    issue_data: list

    pr_data: list

    repository_reports: list

    final_report: str

############## node 1 for fetching profile ######################

def fetch_profile(state: GithubState):
    user=github.get_user(state['username'])
    state['profile']={
        "name": user.name,
        "followers": user.followers,
        "following": user.following,
        "public_repos": user.public_repos,
        "bio": user.bio,
    }
    print("Fetched profile for user:", state['username'])
    return state

################## 2nd Node for fetching Repository     ######################
def fetch_repositories(state: GithubState):
    user=github.get_user(state["username"])
    repos=[]
    for repo in user.get_repos():
        repos.append(repo)

    state["repositories"]=repos
    print(f"Fetched {len(repos)} repositories for user:", state['username'])
    return state

#############3rd node for analyzing repositories ######################
from datetime import datetime, timezone
def file_exists(repo, path):

    try:
        repo.get_contents(path)
        return True
    except Exception:
        return False
from datetime import datetime, timezone

from datetime import datetime, timezone

def analyze_repositories(state: GithubState):

    reports = []

    for repo in state["repositories"]:

        print(f"Analyzing Repository: {repo.name}")

        # ---------------------------------------
        # Last Commit
        # ---------------------------------------
        try:
            commit = repo.get_commits()[0]
            last_commit_date = commit.commit.author.date
            days_since_last_commit = (
                datetime.now(timezone.utc) - last_commit_date
            ).days
        except Exception:
            last_commit_date = None
            days_since_last_commit = None

        # ---------------------------------------
        # Languages
        # ---------------------------------------
        try:
            languages = list(repo.get_languages().keys())
        except Exception:
            languages = []

        if not languages:
            languages = ["Unknown"]

        # ---------------------------------------
        # Repository Health Checks
        # ---------------------------------------
        readme = (
            file_exists(repo, "README.md")
            or file_exists(repo, "readme.md")
        )

        testing = (
            file_exists(repo, "tests")
            or file_exists(repo, "test")
            or file_exists(repo, "pytest.ini")
            or file_exists(repo, "tox.ini")
        )

        cicd = file_exists(repo, ".github/workflows")

        docker = file_exists(repo, "Dockerfile")

        docs = file_exists(repo, "docs")

        license_file = (
            file_exists(repo, "LICENSE")
            or file_exists(repo, "LICENSE.md")
        )

        # ---------------------------------------
        # Repository Activity
        # ---------------------------------------

        if days_since_last_commit is None:
            activity = "Unknown"
        elif days_since_last_commit <= 30:
            activity = "Active"
        elif days_since_last_commit <= 90:
            activity = "Inactive"
        else:
            activity = "Dormant"

        # ---------------------------------------
        # Repository Information
        # ---------------------------------------

        repo_info = {

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

            "last_commit_date": (
                last_commit_date.isoformat()
                if last_commit_date
                else None
            ),

            "days_since_last_commit": days_since_last_commit,

            "activity": activity,

            "readme": readme,

            "testing": testing,

            "cicd": cicd,

            "docker": docker,

            "docs": docs,

            "license": license_file,

        }

        reports.append(repo_info)

    state["repo_analysis"] = reports

    print(f"\nAnalyzed {len(reports)} repositories successfully.")

    return state

###################### node 4 for ReadMe content fetching ###########################
from base64 import b64decode
def fetch_readme(state: GithubState):
    readmes=[]
    for repo in state["repositories"]:
        print(f"Fetching README for {repo.name}...")
        try:
            readme=repo.get_readme()
            content=b64decode(readme.content).decode("utf-8",errors="ignore")
        except Exception:
            content="No README found."
        readmes.append({
            "name": repo.name,
            "content": content
        })

    state["readme_data"] = readmes
    return state
#################################### node 5 for commit data fetching ###########################
def fetch_commits(state: GithubState):

    commit_reports = []

    for repo in state["repositories"]:

        print(f"Fetching commits for {repo.name}")

        try:

            commits = repo.get_commits()

            total_commits = commits.totalCount

            latest = commits[0]

            latest_message = latest.commit.message

            latest_date = latest.commit.author.date

            messages = []

            count = 0

            for commit in commits:

                messages.append(commit.commit.message)

                count += 1

                if count == 10:
                    break

        except Exception:

            total_commits = 0

            latest_message = "Unknown"

            latest_date = None

            messages = []

        commit_reports.append({

            "name": repo.name,

            "total_commits": total_commits,

            "latest_commit": latest_message,

            "latest_date": (
                latest_date.isoformat()
                if latest_date
                else None
            ),

            "messages": messages

        })

    state["commit_data"] = commit_reports

    return state


def fetch_issues(state: GithubState):

    issue_reports = []

    for repo in state["repositories"]:

        print(f"Fetching Issues for {repo.name}")

        try:

            issues = repo.get_issues(state="all")

            total_issues = issues.totalCount

            open_issues = repo.get_issues(state="open").totalCount

            closed_issues = repo.get_issues(state="closed").totalCount

            recent_issues = []

            count = 0

            for issue in issues:

                # Skip Pull Requests
                if issue.pull_request is not None:
                    continue

                recent_issues.append({
                    "title": issue.title,
                    "state": issue.state,
                    "created_at": issue.created_at.isoformat()
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

            "recent_issues": recent_issues

        })

    state["issue_data"] = issue_reports

    return state

def fetch_prs(state: GithubState):

    pr_reports = []

    for repo in state["repositories"]:

        print(f"Fetching Pull Requests for {repo.name}")

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
                    "created_at": pr.created_at.isoformat()
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

            "recent_prs": recent_prs

        })

    state["pr_data"] = pr_reports

    return state

############################ node 5 ai repositaory review ###########################
def ai_repository_review(state: GithubState):

    reports = []

    for repo, readme, commit, issue, pr in zip(
        state["repo_analysis"],
        state["readme_data"],
        state["commit_data"],
        state["issue_data"],
        state["pr_data"]
    ):

        print(f"Generating AI Review for {repo['name']}...")

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

        reports.append(
            {
                "name": repo["name"],
                "ai_review": response.content
            }
        )

    state["repository_reports"] = reports

    return state





############## graph setup #########################

#################### Node setup #########################
from langgraph.graph import StateGraph, START, END

graph = StateGraph(GithubState)

# ==========================
# Nodes
# ==========================

graph.add_node("fetch_profile", fetch_profile)
graph.add_node("fetch_repositories", fetch_repositories)
graph.add_node("analyze_repositories", analyze_repositories)

# Specialist Agents
graph.add_node("fetch_readme", fetch_readme)
graph.add_node("fetch_commits", fetch_commits)
graph.add_node("fetch_issues", fetch_issues)
graph.add_node("fetch_prs", fetch_prs)

# AI Agents
graph.add_node("ai_repository_review", ai_repository_review)


# ==========================
# Edges
# ==========================

graph.add_edge(START, "fetch_profile")

graph.add_edge("fetch_profile", "fetch_repositories")

graph.add_edge("fetch_repositories", "analyze_repositories")

graph.add_edge("analyze_repositories", "fetch_readme")

graph.add_edge("fetch_readme", "fetch_commits")

graph.add_edge("fetch_commits", "fetch_issues")

graph.add_edge("fetch_issues", "fetch_prs")

graph.add_edge("fetch_prs", "ai_repository_review")

graph.add_edge("ai_repository_review", END)



# ==========================
# Compile
# ==========================

workflow = graph.compile()


username=input("Enter GitHub username: ")
input = {
    "username": username,

    "profile": {},

    "repositories": [],

    "repo_analysis": [],

    "readme_data": [],

    "commit_data": [],

    "issue_data": [],

    "pr_data": [],

    "repository_reports": [],

    "final_report": ""
}

result = workflow.invoke(input)

print("\n" + "=" * 80)
print("🤖 AI GITHUB REPOSITORY REVIEW")
print("=" * 80)

for report in result["repository_reports"]:

    print("\n" + "=" * 80)
    print(f"Repository : {report['name']}")
    print("=" * 80)

    print(report["ai_review"])

    print()
from PIL import Image
import io

png_data = workflow.get_graph().draw_mermaid_png()

image = Image.open(io.BytesIO(png_data))
image.save("workflow.png")

print("Workflow saved as workflow.png")
