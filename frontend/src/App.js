import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { ingestRepo, getRepoStatus, askQuestion } from "./api";
export default function App() {
    const [repoUrl, setRepoUrl] = useState("");
    const [repo, setRepo] = useState(null);
    const [ingesting, setIngesting] = useState(false);
    const [ingestError, setIngestError] = useState(null);
    const [messages, setMessages] = useState([]);
    const [question, setQuestion] = useState("");
    const [asking, setAsking] = useState(false);
    const pollRef = useRef(null);
    useEffect(() => {
        return () => {
            if (pollRef.current)
                window.clearInterval(pollRef.current);
        };
    }, []);
    async function handleIngest() {
        setIngestError(null);
        setMessages([]);
        if (!repoUrl.trim())
            return;
        setIngesting(true);
        try {
            const { repoId } = await ingestRepo(repoUrl);
            const status = await getRepoStatus(repoId);
            setRepo(status);
            if (pollRef.current)
                window.clearInterval(pollRef.current);
            pollRef.current = window.setInterval(async () => {
                const updated = await getRepoStatus(repoId);
                setRepo(updated);
                if (updated.status !== "ingesting") {
                    window.clearInterval(pollRef.current);
                    setIngesting(false);
                }
            }, 2000);
        }
        catch (err) {
            setIngestError(err.message);
            setIngesting(false);
        }
    }
    async function handleAsk() {
        if (!repo || repo.status !== "ready" || !question.trim())
            return;
        const q = question.trim();
        setQuestion("");
        setMessages((prev) => [...prev, { role: "user", text: q }]);
        setAsking(true);
        try {
            const result = await askQuestion(repo.id, q);
            setMessages((prev) => [...prev, { role: "assistant", text: result.answer, sources: result.sources }]);
        }
        catch (err) {
            setMessages((prev) => [...prev, { role: "assistant", text: `Error: ${err.message}` }]);
        }
        finally {
            setAsking(false);
        }
    }
    const canAsk = repo?.status === "ready" && !asking;
    return (_jsxs("div", { className: "shell", children: [_jsxs("header", { className: "topbar", children: [_jsx("div", { className: "wordmark", children: "CodeSense" }), _jsx("div", { className: "tagline", children: "ask a codebase what it's doing" })] }), _jsxs("div", { className: "layout", children: [_jsxs("aside", { className: "sidebar", children: [_jsxs("div", { className: "field-group", children: [_jsx("label", { htmlFor: "repo-url", children: "Repository" }), _jsx("input", { id: "repo-url", type: "text", placeholder: "https://github.com/owner/repo", value: repoUrl, onChange: (e) => setRepoUrl(e.target.value), onKeyDown: (e) => e.key === "Enter" && handleIngest(), disabled: ingesting }), _jsx("button", { className: "btn-primary", onClick: handleIngest, disabled: ingesting || !repoUrl.trim(), children: ingesting ? "Ingesting…" : "Ingest repository" }), ingestError && _jsx("p", { className: "error-text", children: ingestError })] }), repo && (_jsxs("div", { className: "repo-status", children: [_jsx("div", { className: "repo-name", children: repo.full_name }), _jsx("div", { className: `status-pill status-${repo.status}`, children: repo.status }), repo.status === "ready" && (_jsxs("div", { className: "repo-meta", children: [repo.file_count, " files \u00B7 ", repo.chunk_count, " chunks indexed"] })), repo.status === "failed" && (_jsx("div", { className: "repo-meta", children: "Ingestion failed \u2014 check the repo is public and try again." }))] })), _jsxs("div", { className: "hint-block", children: [_jsx("p", { children: "Try questions like:" }), _jsxs("ul", { children: [_jsx("li", { children: "\"Where is authentication handled?\"" }), _jsx("li", { children: "\"What does the main entry point do?\"" }), _jsx("li", { children: "\"How is error handling structured?\"" })] })] })] }), _jsxs("main", { className: "chat-panel", children: [_jsxs("div", { className: "messages", children: [messages.length === 0 && (_jsx("div", { className: "empty-state", children: repo?.status === "ready"
                                            ? "Ask something about the repo."
                                            : "Ingest a public GitHub repo to start asking questions." })), messages.map((m, i) => (_jsxs("div", { className: `message message-${m.role}`, children: [_jsx("div", { className: "message-role", children: m.role === "user" ? "You" : "CodeSense" }), _jsx("div", { className: "message-text", children: m.text }), m.sources && m.sources.length > 0 && (_jsx("div", { className: "sources", children: m.sources.map((s, j) => (_jsxs("span", { className: "source-chip", children: [s.filePath, " \u00B7 ", s.score] }, j))) }))] }, i))), asking && _jsx("div", { className: "message message-assistant thinking", children: "Thinking\u2026" })] }), _jsxs("div", { className: "composer", children: [_jsx("input", { type: "text", placeholder: repo?.status === "ready" ? "Ask a question about this repo" : "Ingest a repo first", value: question, onChange: (e) => setQuestion(e.target.value), onKeyDown: (e) => e.key === "Enter" && handleAsk(), disabled: !canAsk }), _jsx("button", { className: "btn-primary", onClick: handleAsk, disabled: !canAsk || !question.trim(), children: "Ask" })] })] })] })] }));
}
