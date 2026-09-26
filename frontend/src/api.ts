export interface RepoStatus {
  id: number;
  full_name: string;
  status: "ingesting" | "ready" | "failed";
  file_count: number;
  chunk_count: number;
}

export interface Source {
  filePath: string;
  score: number;
}

export interface AskResult {
  answer: string;
  sources: Source[];
}

async function handle<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data as T;
}

export async function ingestRepo(repoUrl: string): Promise<{ repoId: number; status: string }> {
  const res = await fetch("/api/ingest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repoUrl }),
  });
  return handle(res);
}

export async function getRepoStatus(repoId: number): Promise<RepoStatus> {
  const res = await fetch(`/api/repos/${repoId}/status`);
  return handle(res);
}

export async function askQuestion(repoId: number, question: string): Promise<AskResult> {
  const res = await fetch("/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repoId, question }),
  });
  return handle(res);
}
