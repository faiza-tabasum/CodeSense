# Extending the MVP → full CodeSense

In priority order — each of these is a self-contained upgrade to one part of
the pipeline, not a rewrite.

## 1. Real AST-based chunking (tree-sitter)
Replace `backend/src/services/chunker.ts`'s heuristic splitter with
tree-sitter parsing per language. Chunk by function/class node instead of
brace-counting. This alone measurably improves retrieval quality — worth
running before/after and recording the numbers (see #4).

## 2. Dedicated vector DB (Chroma or Qdrant)
Swap `backend/src/services/vectorSearch.ts`'s in-memory cosine loop for a
real ANN index. Once you're past ~5-10k chunks this stops being optional.
Keep MySQL for everything relational (repos, users, chunk metadata) —
this becomes a genuine polyglot-persistence setup you can defend in an
interview.

## 3. Dependency/call-graph
Build a graph of function calls/imports from the AST (from #1). Lets you
answer "what depends on this" questions via graph traversal instead of
similarity search alone — this is where a DSA-heavy interviewer lights up.

## 4. Evaluation harness
Before doing #1 and #2, write down ~20-30 known question→correct-file pairs
for a repo you know well. Measure retrieval precision/recall now, then again
after each upgrade. "I measured retrieval accuracy and improved it from X%
to Y% by switching to AST chunking" is the single highest-value sentence
you can put on a resume for this project. Do this early, not last.

## 5. PR review pipeline (LangGraph)
GitHub webhook → diff parser → LangGraph state machine (retrieve context →
analyze → validate structured output → retry on schema failure → post
comment). This is the natural place to use LangGraph instead of a single
LangChain call, because it's genuinely a multi-step, conditional workflow —
not just to have it on the resume.

## 6. Async job queue (BullMQ + Redis)
Needed once ingestion or PR review takes long enough that the webhook/API
response can't wait on it synchronously.
