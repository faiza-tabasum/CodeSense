async function handle(res) {
    const data = await res.json();
    if (!res.ok)
        throw new Error(data.error || "Request failed");
    return data;
}
export async function ingestRepo(repoUrl) {
    const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl }),
    });
    return handle(res);
}
export async function getRepoStatus(repoId) {
    const res = await fetch(`/api/repos/${repoId}/status`);
    return handle(res);
}
export async function askQuestion(repoId, question) {
    const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoId, question }),
    });
    return handle(res);
}
