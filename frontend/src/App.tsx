import { useEffect, useRef, useState } from "react";
import { ingestRepo, getRepoStatus, askQuestion, RepoStatus, Source } from "./api";

interface Message {
  role: "user" | "assistant";
  text: string;
  sources?: Source[];
}

export default function App() {
  const [repoUrl, setRepoUrl] = useState("");
  const [repo, setRepo] = useState<RepoStatus | null>(null);
  const [ingesting, setIngesting] = useState(false);
  const [ingestError, setIngestError] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);

  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, []);

  async function handleIngest() {
    setIngestError(null);
    setMessages([]);
    if (!repoUrl.trim()) return;

    setIngesting(true);
    try {
      const { repoId } = await ingestRepo(repoUrl);
      const status = await getRepoStatus(repoId);
      setRepo(status);

      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = window.setInterval(async () => {
        const updated = await getRepoStatus(repoId);
        setRepo(updated);
        if (updated.status !== "ingesting") {
          window.clearInterval(pollRef.current!);
          setIngesting(false);
        }
      }, 2000);
    } catch (err: any) {
      setIngestError(err.message);
      setIngesting(false);
    }
  }

  async function handleAsk() {
    if (!repo || repo.status !== "ready" || !question.trim()) return;
    const q = question.trim();
    setQuestion("");
    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setAsking(true);
    try {
      const result = await askQuestion(repo.id, q);
      setMessages((prev) => [...prev, { role: "assistant", text: result.answer, sources: result.sources }]);
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: "assistant", text: `Error: ${err.message}` }]);
    } finally {
      setAsking(false);
    }
  }

  const canAsk = repo?.status === "ready" && !asking;

  return (
    <div className="shell">
      <header className="topbar">
        <div className="wordmark">CodeSense</div>
        <div className="tagline">ask a codebase what it's doing</div>
      </header>

      <div className="layout">
        <aside className="sidebar">
          <div className="field-group">
            <label htmlFor="repo-url">Repository</label>
            <input
              id="repo-url"
              type="text"
              placeholder="https://github.com/owner/repo"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleIngest()}
              disabled={ingesting}
            />
            <button className="btn-primary" onClick={handleIngest} disabled={ingesting || !repoUrl.trim()}>
              {ingesting ? "Ingesting…" : "Ingest repository"}
            </button>
            {ingestError && <p className="error-text">{ingestError}</p>}
          </div>

          {repo && (
            <div className="repo-status">
              <div className="repo-name">{repo.full_name}</div>
              <div className={`status-pill status-${repo.status}`}>{repo.status}</div>
              {repo.status === "ready" && (
                <div className="repo-meta">
                  {repo.file_count} files · {repo.chunk_count} chunks indexed
                </div>
              )}
              {repo.status === "failed" && (
                <div className="repo-meta">
                  Ingestion failed — check the repo is public and try again.
                </div>
              )}
            </div>
          )}

          <div className="hint-block">
            <p>Try questions like:</p>
            <ul>
              <li>"Where is authentication handled?"</li>
              <li>"What does the main entry point do?"</li>
              <li>"How is error handling structured?"</li>
            </ul>
          </div>
        </aside>

        <main className="chat-panel">
          <div className="messages">
            {messages.length === 0 && (
              <div className="empty-state">
                {repo?.status === "ready"
                  ? "Ask something about the repo."
                  : "Ingest a public GitHub repo to start asking questions."}
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`message message-${m.role}`}>
                <div className="message-role">{m.role === "user" ? "You" : "CodeSense"}</div>
                <div className="message-text">{m.text}</div>
                {m.sources && m.sources.length > 0 && (
                  <div className="sources">
                    {m.sources.map((s, j) => (
                      <span key={j} className="source-chip">
                        {s.filePath} · {s.score}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {asking && <div className="message message-assistant thinking">Thinking…</div>}
          </div>

          <div className="composer">
            <input
              type="text"
              placeholder={repo?.status === "ready" ? "Ask a question about this repo" : "Ingest a repo first"}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAsk()}
              disabled={!canAsk}
            />
            <button className="btn-primary" onClick={handleAsk} disabled={!canAsk || !question.trim()}>
              Ask
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
