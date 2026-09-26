# CodeSense 

Ask natural-language questions about any public GitHub repo, backed by a real
(if intentionally small) RAG pipeline: repo ingestion → chunking → embeddings
→ retrieval → LLM answer with source citations.

## What CodeSense actually does

- Fetches a public GitHub repo's source files via the GitHub REST API
- Chunks each file (function/class-boundary heuristic, not full AST parsing)
- Embeds each chunk (OpenAI embeddings) and stores them in MySQL as JSON
- On a question: embeds the question, computes cosine similarity against
  stored chunks in-app, retrieves the top-k, and asks an LLM (via LangChain)
  to answer using only that context
- React chat UI: paste a repo URL, ingest, ask questions, see which files
  the answer came from

## What it deliberately does NOT do yet (see NEXT_STEPS.md)

- No tree-sitter AST parsing (chunking is heuristic, language-agnostic-ish)
- No dedicated vector DB (similarity is computed in Node — fine at hundreds
  of chunks, not fine at tens of thousands)
- No PR review pipeline / LangGraph workflow
- No evaluation harness

These are the Phase 2+ items from the original project plan. This MVP is
scoped to prove the core RAG loop end-to-end in ~2 days of work.

## Setup

### 1. Database

```bash
mysql -u root -p < backend/src/schema.sql
```

### 2. Backend

```bash
cd backend
cp ../.env.example .env   # fill in your keys
npm install
npm run dev                # starts on http://localhost:4000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev                # starts on http://localhost:5173
```

Open http://localhost:5173, paste a small public repo (e.g.
`https://github.com/expressjs/express` — or better, a small personal repo so
ingestion is fast), click **Ingest**, then ask questions.

## Environment variables (`.env` in `backend/`)

```
PORT=4000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=codesense
OPENAI_API_KEY=sk-...
GITHUB_TOKEN=ghp_...        # optional but recommended (rate limits)
```

## Why MySQL + in-app cosine similarity instead of a vector DB

For an MVP with a handful of small repos and a few hundred chunks, brute-force
cosine similarity in Node is fast enough (milliseconds) and removes an entire
infra dependency. It stops being the right call once you're indexing
thousands of chunks per repo or need approximate nearest-neighbor search at
scale — that's precisely the point where you'd swap in Chroma/Qdrant, and
being able to explain *why* and *when* that swap matters is worth more in an
interview than having installed the vector DB on day one.
